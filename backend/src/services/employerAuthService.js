import bcrypt from "bcryptjs";
import Employer from "../models/Employer.js";
import { HttpError } from "../utils/httpError.js";
import { signEmployerToken } from "../utils/token.js";
import { normalizeEmail } from "../validators/authValidators.js";

// Older accounts may have been saved with mixed-case emails, so lookups ignore case.
const CASE_INSENSITIVE = { locale: "en", strength: 2 };
const findByEmail = (email) => Employer.findOne({ email }).collation(CASE_INSENSITIVE);

const session = (employer) => ({
  token: signEmployerToken(employer),
  employer: { _id: employer._id, companyName: employer.companyName, email: employer.email },
});

export async function registerEmployer({ companyName, email: rawEmail, password }) {
  const email = normalizeEmail(rawEmail);
  if (await findByEmail(email)) throw new HttpError(400, "Email already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  let employer;
  try {
    employer = await Employer.create({ companyName: companyName.trim(), email, password: hashedPassword });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(400, "Email already registered");
    throw err;
  }
  return session(employer);
}

export async function loginEmployer({ email: rawEmail, password }) {
  const employer = await findByEmail(normalizeEmail(rawEmail));
  if (!employer) throw new HttpError(401, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, employer.password);
  if (!isMatch) throw new HttpError(401, "Invalid credentials");

  return session(employer);
}
