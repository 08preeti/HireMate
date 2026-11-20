import { HttpError } from "../utils/httpError.js";

const LANGS = ["en", "hi", "mr"];
const OBJECT_ID = /^[a-f\d]{24}$/i;
const ROUTE = /^\/[A-Za-z0-9\-_/\[\]]{0,100}$/;

function timeZone(v) {
  if (typeof v !== "string" || v.length > 60) return "Asia/Kolkata";
  try { new Intl.DateTimeFormat("en", { timeZone: v }); return v; } catch { return "Asia/Kolkata"; }
}

export function validateAssistantMessage(body = {}) {
  const { message, history, context = {} } = body;
  if (typeof message !== "string" || !message.trim()) throw new HttpError(400, "Message is required");
  if (message.length > 1000) throw new HttpError(400, "Message must be 1000 characters or fewer");
  if (history !== undefined && !Array.isArray(history)) throw new HttpError(400, "Invalid history");
  if (typeof context !== "object" || Array.isArray(context) || context === null) throw new HttpError(400, "Invalid context");

  // Context is a hint for wording only. Nothing in it grants access: every tool re-checks identity and ownership.
  const shown = (Array.isArray(context.shown) ? context.shown : []).slice(0, 10)
    .filter((s) => s && typeof s.id === "string" && OBJECT_ID.test(s.id) && typeof s.title === "string" && ["job", "application"].includes(s.kind))
    .map((s) => ({ kind: s.kind, id: s.id, title: s.title.replace(/[\r\n]+/g, " ").slice(0, 120) }));

  return {
    message: message.trim(),
    history: history ?? [],
    context: {
      language: LANGS.includes(context.language) ? context.language : "en",
      route: typeof context.route === "string" && ROUTE.test(context.route) ? context.route : "",
      timeZone: timeZone(context.timeZone),
      shown,
    },
  };
}
