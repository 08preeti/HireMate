export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express 5 forwards rejected async handlers here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ message: err.status ? err.message : "Internal server error" });
}
