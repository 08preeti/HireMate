import { randomInt, timingSafeEqual } from "node:crypto";
import Worker from "../models/Worker.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { signWorkerToken } from "../utils/token.js";
import { sendOtpSms } from "./smsService.js";

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const sameOtp = (stored, given) => {
  const a = Buffer.from(String(stored));
  const b = Buffer.from(String(given));
  return a.length === b.length && timingSafeEqual(a, b);
};

// Checks the code and counts wrong guesses per phone, so it cannot be brute-forced from many IPs.
async function assertValidOtp(worker, otp) {
  if (!worker || !worker.otp) throw new HttpError(400, "OTP not found. Please request a new one.");
  if (new Date() > new Date(worker.otpExpires)) throw new HttpError(400, "OTP expired. Please request a new one.");
  if ((worker.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) throw new HttpError(429, "Too many wrong attempts. Please request a new OTP.");
  if (sameOtp(worker.otp, otp)) return;

  const updated = await Worker.findOneAndUpdate({ _id: worker._id, otp: worker.otp }, { $inc: { otpAttempts: 1 } }, { new: true });
  if (updated && updated.otpAttempts >= MAX_OTP_ATTEMPTS) await Worker.updateOne({ _id: worker._id }, { otp: null, otpExpires: null });
  throw new HttpError(400, "Wrong OTP. Please try again.");
}

export async function sendWorkerOtp(phone) {
  const otp = String(randomInt(100000, 1000000));
  const expires = new Date(Date.now() + OTP_TTL_MS);

  // OTP lives in MongoDB so it survives restarts / spin-downs
  const save = () =>
    Worker.findOneAndUpdate({ phone }, { otp, otpExpires: expires, otpAttempts: 0 }, { upsert: true, new: true });
  try {
    await save();
  } catch (err) {
    if (err.code !== 11000) throw err;
    await save(); // two first-time requests raced: the other one created the account, so just update it
  }

  const smsSent = await sendOtpSms(phone, otp);

  // The OTP is only echoed back outside production and only when no real SMS went out (dev/demo).
  const includeOtp = !env.isProduction && !smsSent;
  return {
    success: true,
    message: smsSent ? "OTP sent to your phone" : "OTP sent",
    ...(includeOtp ? { otp } : {}),
  };
}

// Everything sent to the client goes through here, so OTP fields can never leak into a response.
const publicWorker = (doc) => {
  const { otp: _otp, otpExpires: _otpExpires, otpAttempts: _otpAttempts, ...safe } = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return safe;
};

// Only "male" / "female" are stored; anything else becomes "" (unknown).
const cleanGender = (g) => (g === "male" || g === "female" ? g : "");

export async function verifyWorkerOtp({
  phone,
  otp,
  name,
  skills,
  location,
  gender,
}) {
  const worker = await Worker.findOne({ phone });
  await assertValidOtp(worker, otp);

  // New worker: the OTP is correct but we still need a name. Do NOT burn the OTP yet,
  // so the follow-up call that carries the profile can reuse it.
  if (!worker.name && !name)
    throw new HttpError(400, "Name required for new registration");

  await Worker.findByIdAndUpdate(worker._id, { otp: null, otpExpires: null, otpAttempts: 0 });

  if (!worker.name) {
    const updated = await Worker.findByIdAndUpdate(
      worker._id,
      {
        name,
        skills: skills || "",
        location: location || "",
        gender: cleanGender(gender),
      },
      { new: true },
    );
    return { success: true, worker: publicWorker(updated), token: signWorkerToken(updated) };
  }

  return { success: true, worker: publicWorker(worker), token: signWorkerToken(worker) };
}

/**
 * POST /api/workers/register — kept for compatibility, but it no longer mints a
 * session for an unverified phone number: the OTP for `contact` is required.
 */
export async function registerWorker({
  name,
  skills,
  location,
  gender,
  contact,
  otp,
}) {
  if (!name || !contact)
    throw new HttpError(400, "Name and contact are required");
  if (!otp)
    throw new HttpError(400, "OTP required. Verify your phone number first.");

  const worker = await Worker.findOne({ phone: contact });
  await assertValidOtp(worker, otp);

  const updated = await Worker.findByIdAndUpdate(
    worker._id,
    {
      name,
      skills,
      location,
      gender: cleanGender(gender),
      otp: null,
      otpExpires: null,
      otpAttempts: 0,
    },
    { new: true },
  );
  return { ...publicWorker(updated), token: signWorkerToken(updated) };
}
