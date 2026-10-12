import { ROLES } from "../constants/roles.js";

// GET /api/auth/me — who does the server say this token belongs to?
// `authenticate` already verified the token and loaded the account, so the role
// returned here is the verified one, never a value the client stored or sent.
export function me(req, res) {
  if (req.auth.role === ROLES.EMPLOYER) {
    const { _id, companyName, email } = req.user;
    return res.json({ role: ROLES.EMPLOYER, user: { _id, companyName, email } });
  }
  return res.json({ role: ROLES.WORKER, user: req.user.toObject() });
}
