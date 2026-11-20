import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// A prepared action is handed to the browser as a signed token. Only a user pressing Confirm sends it back, and the
// server executes exactly what was signed: same user, same role, same tool, same arguments. The model never sees it.
const PURPOSE = "assistant-action";
export const ACTION_TTL_SECONDS = 300;

export function createActionTokens(secret, { now = () => Date.now() } = {}) {
  const used = new Map(); // jti -> expiry ms. Single-use; entries are dropped once the token could no longer verify anyway.
  const sweep = () => { for (const [k, exp] of used) if (exp < now()) used.delete(k); };

  return {
    sign({ sub, role, tool, args, card }) {
      const jti = crypto.randomUUID();
      const exp = Math.floor(now() / 1000) + ACTION_TTL_SECONDS;
      const token = jwt.sign({ purpose: PURPOSE, sub, role, tool, args, card, jti, exp }, secret);
      return { token, expiresAt: exp * 1000 };
    },
    /** Verifies signature + expiry. Throws on anything off. Does NOT consume. */
    verify(token) {
      const p = jwt.verify(token, secret, { clockTimestamp: Math.floor(now() / 1000) });
      if (p.purpose !== PURPOSE) throw new Error("wrong token purpose");
      return p;
    },
    /** Atomically claims the token. Returns false if it was already used. */
    consume(payload) {
      sweep();
      if (used.has(payload.jti)) return false;
      used.set(payload.jti, payload.exp * 1000 + 60_000);
      return true;
    },
  };
}
