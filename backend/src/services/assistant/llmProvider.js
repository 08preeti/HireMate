import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";

// Provider boundary. The orchestrator only knows this shape, so another provider is one adapter away:
//   chat({ system, messages, tools, maxTokens }) -> { text, toolCalls: [{ id, name, input }], content, usage, stop }
// Messages use content blocks: { role, content: string | [{type:"text"} | {type:"tool_use"} | {type:"tool_result"}] }.

const RETRYABLE = new Set([429, 500, 502, 503, 529]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function isConfigured() {
  return env.ai.provider === "anthropic" && !!env.ai.apiKey;
}

export function createAnthropicProvider(cfg = env.ai, fetchImpl = fetch) {
  return {
    name: "anthropic",
    async chat({
      system,
      messages,
      tools = [],
      maxTokens = cfg.maxOutputTokens,
    }) {
      if (!cfg.apiKey)
        throw new HttpError(503, "The assistant is not configured", {
          code: "AI_UNAVAILABLE",
        });
      const body = {
        model: cfg.model,
        max_tokens: maxTokens,
        system,
        messages,
        ...(tools.length && {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema,
          })),
        }),
      };
      let lastStatus = 0;
      let lastRes = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        let res;
        try {
          res = await fetchImpl(`${cfg.baseUrl}/v1/messages`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": cfg.apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(cfg.timeoutMs),
          });
        } catch (err) {
          if (attempt === 0) {
            await sleep(400);
            continue;
          }
          throw new HttpError(504, "The assistant took too long to respond", {
            code: "AI_TIMEOUT",
          });
        }
        lastStatus = res.status;
        lastRes = res;
        if (res.ok) {
          const data = await res.json();
          const content = Array.isArray(data.content) ? data.content : [];
          return {
            text: content
              .filter((b) => b.type === "text")
              .map((b) => b.text)
              .join("\n")
              .trim(),
            toolCalls: content
              .filter((b) => b.type === "tool_use")
              .map((b) => ({ id: b.id, name: b.name, input: b.input })),
            content,
            stop: data.stop_reason,
            usage: {
              input: data.usage?.input_tokens ?? 0,
              output: data.usage?.output_tokens ?? 0,
            },
          };
        }
        if (RETRYABLE.has(res.status) && attempt === 0) {
          await sleep(600);
          continue;
        }
        break;
      }
      // Never forward provider error bodies (they can echo request content or account details).
      // Server log only (never sent to the browser): the provider's error type + short reason, so a 400/401/404 is diagnosable.
      let detail = "";
      try {
        const e = (await lastRes?.json())?.error;
        detail = e
          ? ` type=${e.type} message=${String(e.message).slice(0, 200)}`
          : "";
      } catch {
        /* body not JSON */
      }
      console.error("[assistant] provider error status", lastStatus, detail);
      throw new HttpError(502, "The assistant is temporarily unavailable", {
        code: "AI_PROVIDER_ERROR",
      });
    },
  };
}
