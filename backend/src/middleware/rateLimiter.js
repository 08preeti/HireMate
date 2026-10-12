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
