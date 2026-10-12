import bcrypt from "bcryptjs";
import Employer from "../models/Employer.js";
import { HttpError } from "../utils/httpError.js";
import { signEmployerToken } from "../utils/token.js";

export async function registerEmployer({ companyName, email, password }) {
  const existing = await Employer.findOne({ email });
  if (existing) throw new HttpError(400, "Email already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const employer = await Employer.create({ companyName, email, password: hashedPassword });

  // Same session shape as login, so a new employer lands on the dashboard without a second sign-in.
  return {
    token: signEmployerToken(employer),
    employer: { _id: employer._id, companyName: employer.companyName, email: employer.email },
  };
}

export async function loginEmployer({ email, password }) {
  const employer = await Employer.findOne({ email });
  if (!employer) throw new HttpError(401, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, employer.password);
  if (!isMatch) throw new HttpError(401, "Invalid credentials");

  return {
    token: signEmployerToken(employer),
    employer: { _id: employer._id, companyName: employer.companyName, email: employer.email },
  };
}
