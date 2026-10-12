import { HttpError } from "../utils/httpError.js";

export function validateEmployerRegister({ companyName, email, password } = {}) {
  if (!companyName || !email || !password) throw new HttpError(400, "All fields are required");
}

export function validateEmployerLogin({ email, password } = {}) {
  if (!email || !password) throw new HttpError(400, "Email and password required");
}

export function validatePhone(phone) {
  if (!phone || String(phone).length < 10) throw new HttpError(400, "Valid phone number required");
}

export function validateOtpVerify({ phone, otp } = {}) {
  if (!phone || !otp) throw new HttpError(400, "Phone and OTP required");
}
