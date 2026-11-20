import { HttpError, sendError } from "../utils/httpError.js";
import { ROLES } from "../constants/roles.js";
import { env } from "../config/env.js";
import { validateAssistantMessage } from "../validators/assistantValidators.js";
import { runAgent } from "../services/assistant/agentOrchestrator.js";
import { createToolRegistry, defaultDeps } from "../services/assistant/toolRegistry.js";
import { createAnthropicProvider, isConfigured } from "../services/assistant/llmProvider.js";
import { createActionTokens } from "../services/assistant/actionTokens.js";

const contextOf = (req) => ({
  auth: req.auth,
  user: req.user,
  displayName: req.auth.role === ROLES.EMPLOYER ? req.user?.companyName : req.user?.name,
});

function readToken(body, tokens) {
  const raw = body?.token;
  if (typeof raw !== "string" || !raw || raw.length > 4000) throw new HttpError(400, "Invalid confirmation");
  let payload;
  try { payload = tokens.verify(raw); } catch (e) {
    throw new HttpError(410, e?.name === "TokenExpiredError" ? "This confirmation has expired. Please ask me again." : "Invalid confirmation");
  }
  return payload;
}

/** Factory so tests can inject a fake registry / provider / clock. */
export function createAssistantHandlers({ getRegistry, getProvider, tokens, configured = isConfigured }) {
  // A token only works for the exact account it was issued to.
  const assertOwner = (req, p) => {
    if (p.sub !== req.auth.id || p.role !== req.auth.role) throw new HttpError(403, "This confirmation belongs to a different account");
  };

  return {
    status(req, res) {
      res.json({ available: configured() });
    },

    async message(req, res) {
      try {
        if (!configured()) return res.status(503).json({ message: "The assistant is not available right now.", code: "AI_UNAVAILABLE" });
        const input = validateAssistantMessage(req.body);
        const out = await runAgent({ provider: await getProvider(), registry: await getRegistry(), ctx: contextOf(req), history: input.history, message: input.message, context: input.context });
        const pending = out.pendingActions.map(({ tool, args, card }) => {
          const { token, expiresAt } = tokens.sign({ sub: req.auth.id, role: req.auth.role, tool, args, card });
          return { token, expiresAt, ...card };
        });
        // Usage only — never message text — so cost is observable without logging personal content.
        console.log(`[assistant] ${req.auth.role} steps=${out.usage.steps} in=${out.usage.input} out=${out.usage.output} pending=${pending.length}`);
        res.json({ reply: out.reply, actions: out.clientActions, shown: out.shown, pending });
      } catch (err) {
        sendError(res, err, "The assistant ran into a problem. Please try again.");
      }
    },

    /** The ONLY path that performs an assistant write. Triggered by the user pressing Confirm. */
    async confirm(req, res) {
      try {
        const payload = readToken(req.body, tokens);
        assertOwner(req, payload);
        if (!tokens.consume(payload)) throw new HttpError(409, "This action was already handled");
        const result = await (await getRegistry()).commit(contextOf(req), payload.tool, payload.args);
        console.log(`[assistant-action] ${req.auth.role} ${payload.tool} ${result.ok ? "done" : "failed"}`);
        if (!result.ok) return res.status(409).json({ ok: false, message: result.error });
        res.json({ ok: true, message: result.message, ...(result.affects && { affects: result.affects }) });
      } catch (err) {
        sendError(res, err, "That could not be completed right now. Please try again.");
      }
    },

    async cancel(req, res) {
      try {
        const payload = readToken(req.body, tokens);
        assertOwner(req, payload);
        tokens.consume(payload); // a cancelled card can never be confirmed later
        res.json({ ok: true });
      } catch (err) {
        sendError(res, err, "Could not cancel");
      }
    },
  };
}

let registry, provider;
const handlers = createAssistantHandlers({
  getRegistry: async () => (registry ||= createToolRegistry(await defaultDeps())),
  getProvider: async () => (provider ||= createAnthropicProvider()),
  tokens: createActionTokens(env.jwtSecret),
});
export const { status, message, confirm, cancel } = handlers;
