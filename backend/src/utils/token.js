import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";

// The role is signed INTO the token, so it can never be supplied by the client.
export function signEmployerToken(employer) {
  return jwt.sign({ id: employer._id.toString(), role: ROLES.EMPLOYER }, env.jwtSecret, { expiresIn: "7d" });
}

export function signWorkerToken(worker) {
  return jwt.sign(
    { id: worker._id.toString(), phone: worker.phone, role: ROLES.WORKER },
    env.jwtSecret,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret);
  // Tokens issued before roles existed: worker tokens carried a phone, employer tokens did not.
  const role = decoded.role || (decoded.phone ? ROLES.WORKER : ROLES.EMPLOYER);
  return { id: decoded.id, role };
}
