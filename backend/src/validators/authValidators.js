import { HttpError } from "../utils/httpError.js";

const isString = (v) => typeof v === "string";
const PHONE = /^\+?\d{10,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email) => email.trim().toLowerCase();

export function validateEmployerRegister({ companyName, email, password } = {}) {
  if (!companyName || !email || !password) throw new HttpError(400, "All fields are required");
  if (!isString(companyName) || !isString(email) || !isString(password)) throw new HttpError(400, "Invalid details");
  const name = companyName.trim();
  if (name.length < 2 || name.length > 100) throw new HttpError(400, "Company name must be between 2 and 100 characters");
  if (email.length > 254 || !EMAIL.test(email.trim())) throw new HttpError(400, "Enter a valid email address");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
  if (password.length > 72) throw new HttpError(400, "Password must be 72 characters or fewer");
}

export function validateEmployerLogin({ email, password } = {}) {
  if (!email || !password) throw new HttpError(400, "Email and password required");
  if (!isString(email) || !isString(password) || email.length > 254 || password.length > 200) throw new HttpError(400, "Invalid email or password");
}

export function validatePhone(phone) {
  if (!isString(phone) || !PHONE.test(phone)) throw new HttpError(400, "Valid phone number required");
}

function validateOtp(otp) {
  if (!isString(otp) || !/^\d{6}$/.test(otp)) throw new HttpError(400, "Enter the 6-digit OTP");
}

function validateOptionalProfile({ name, skills, location, gender } = {}) {
  if (name !== undefined && (!isString(name) || name.trim().length < 2 || name.trim().length > 60)) throw new HttpError(400, "Name must be between 2 and 60 characters");
  if (skills !== undefined && (!isString(skills) || skills.length > 200)) throw new HttpError(400, "Skills must be at most 200 characters");
  if (location !== undefined && (!isString(location) || location.length > 100)) throw new HttpError(400, "Location must be at most 100 characters");
  if (gender !== undefined && !isString(gender)) throw new HttpError(400, "Invalid gender");
}

export function validateOtpVerify(body = {}) {
  if (!body.phone || !body.otp) throw new HttpError(400, "Phone and OTP required");
  validatePhone(body.phone);
  validateOtp(body.otp);
  validateOptionalProfile(body);
}

export function validateWorkerRegister(body = {}) {
  if (!body.name || !body.contact) throw new HttpError(400, "Name and contact are required");
  if (!body.otp) throw new HttpError(400, "OTP required. Verify your phone number first.");
  validatePhone(body.contact);
  validateOtp(body.otp);
  validateOptionalProfile(body);
}
