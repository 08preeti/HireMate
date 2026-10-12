import Employer from "../models/Employer.js";
import Worker from "../models/Worker.js";
import { ROLES } from "../constants/roles.js";
import { verifyToken } from "../utils/token.js";

function readBearer(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Verifies the JWT, then confirms the account still exists IN THE DATABASE for
// the role stored inside the (signed) token. Sets:
//   req.auth = { id, role, phone? }   <- the only trusted identity
//   req.user = the Mongoose document
async function resolveIdentity(token) {
  const { id, role } = verifyToken(token);

  if (role === ROLES.EMPLOYER) {
    const employer = await Employer.findById(id).select("-password");
    return employer ? { auth: { id: employer._id.toString(), role }, user: employer } : null;
  }
  if (role === ROLES.WORKER) {
    const worker = await Worker.findById(id).select("-otp -otpExpires");
    return worker ? { auth: { id: worker._id.toString(), role, phone: worker.phone }, user: worker } : null;
  }
  return null;
}

/** Requires a valid token. */
export async function authenticate(req, res, next) {
  const token = readBearer(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const identity = await resolveIdentity(token);
    if (!identity) return res.status(401).json({ message: "Account not found" });
    req.auth = identity.auth;
    req.user = identity.user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * For public data (e.g. browsing jobs): visitors without a token pass through,
 * but a PRESENT token must be valid. Pair with allowVisitorOr to still keep the
 * wrong role out.
 */
export async function optionalAuthenticate(req, res, next) {
  if (!readBearer(req)) return next();
  return authenticate(req, res, next);
}
