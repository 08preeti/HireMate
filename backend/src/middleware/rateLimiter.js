import rateLimit from "express-rate-limit";

// Limits OTP requests/verification — prevents SMS-bombing and OTP brute-forcing.
// 5 requests per phone-adjacent IP per 15 minutes is generous for real users,
// tight enough to stop automated abuse.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Please try again in 15 minutes." },
});

// Limits employer login/register attempts — prevents password brute-forcing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// One bucket per signed-in user (not per IP), so users sharing a network do not throttle each other.
// Must run AFTER authenticate.
export const perUserLimiter = ({ windowMs = 60 * 1000, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.auth?.role}:${req.auth?.id}`,
    message: { message },
  });

// Broad per-IP ceiling for the whole API. Generous on purpose: the apps poll for notifications and tracking.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down and try again shortly." },
});
