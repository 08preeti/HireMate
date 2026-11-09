// Throw from services; controllers translate it into a JSON response.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.extra = extra;
  }
}

/**
 * Sends the right JSON error. `key` keeps the original response shape of each
 * endpoint family ({ error } for employer auth / AI, { message } elsewhere) so
 * the existing frontend keeps working.
 */
export function sendError(res, err, fallbackMessage, key = "message") {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ [key]: err.message, ...err.extra });
  }
  if (err?.name === "CastError") return res.status(400).json({ [key]: "Invalid id or value" });
  console.error(fallbackMessage, err);
  return res.status(500).json({ [key]: fallbackMessage });
}
