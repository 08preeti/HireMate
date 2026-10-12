// Must run AFTER authenticate. Compares against the role from the verified
// token/database — never against anything the client sends in the body/query.
export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ message: "Authentication required" });
  if (!allowed.includes(req.auth.role)) {
    return res.status(403).json({ message: `Access denied: ${allowed.join(" / ")} accounts only` });
  }
  return next();
};

/** Public route that is closed to the wrong role: visitors (no req.auth) pass. */
export const allowVisitorOr = (...allowed) => (req, res, next) => {
  if (!req.auth) return next();
  return requireRole(...allowed)(req, res, next);
};
