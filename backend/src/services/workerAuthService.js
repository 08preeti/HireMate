import { randomInt } from "node:crypto";
import Worker from "../models/Worker.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { signWorkerToken } from "../utils/token.js";
import { sendOtpSms } from "./smsService.js";

const OTP_TTL_MS = 15 * 60 * 1000;

export async function sendWorkerOtp(phone) {
  const otp = String(randomInt(100000, 1000000));
  const expires = new Date(Date.now() + OTP_TTL_MS);

  // OTP lives in MongoDB so it survives restarts / spin-downs
  await Worker.findOneAndUpdate({ phone }, { otp, otpExpires: expires }, { upsert: true, new: true });

  const smsSent = await sendOtpSms(phone, otp);

  // The OTP is only echoed back outside production and only when no real SMS went out (dev/demo).
  const includeOtp = !env.isProduction && !smsSent;
  return {
    success: true,
    message: smsSent ? "OTP sent to your phone" : "OTP sent",
    ...(includeOtp ? { otp } : {}),
  };
}

export async function verifyWorkerOtp({ phone, otp, name, skills, location }) {
  const worker = await Worker.findOne({ phone });

  if (!worker || !worker.otp) throw new HttpError(400, "OTP not found. Please request a new one.");
  if (new Date() > new Date(worker.otpExpires)) throw new HttpError(400, "OTP expired. Please request a new one.");
  if (worker.otp !== otp) throw new HttpError(400, "Wrong OTP. Please try again.");

  // New worker: the OTP is correct but we still need a name. Do NOT burn the OTP yet,
  // so the follow-up call that carries the profile can reuse it.
  if (!worker.name && !name) throw new HttpError(400, "Name required for new registration");

  await Worker.findByIdAndUpdate(worker._id, { otp: null, otpExpires: null });

  if (!worker.name) {
    const updated = await Worker.findByIdAndUpdate(
      worker._id,
      { name, skills: skills || "", location: location || "" },
      { new: true }
    );
    return { success: true, worker: updated, token: signWorkerToken(updated) };
  }

  // `worker` was read before the OTP was cleared, so strip the OTP fields from what goes to the client.
  const { otp: _otp, otpExpires: _otpExpires, ...safeWorker } = worker.toObject();
  return { success: true, worker: safeWorker, token: signWorkerToken(worker) };
}

/**
 * POST /api/workers/register — kept for compatibility, but it no longer mints a
 * session for an unverified phone number: the OTP for `contact` is required.
 */
export async function registerWorker({ name, skills, location, contact, otp }) {
  if (!name || !contact) throw new HttpError(400, "Name and contact are required");
  if (!otp) throw new HttpError(400, "OTP required. Verify your phone number first.");

  const worker = await Worker.findOne({ phone: contact });
  if (!worker || !worker.otp) throw new HttpError(400, "OTP not found. Please request a new one.");
  if (new Date() > new Date(worker.otpExpires)) throw new HttpError(400, "OTP expired. Please request a new one.");
  if (worker.otp !== otp) throw new HttpError(400, "Wrong OTP. Please try again.");

  const updated = await Worker.findByIdAndUpdate(
    worker._id,
    { name, skills, location, otp: null, otpExpires: null },
    { new: true }
  );
  return { ...updated._doc, token: signWorkerToken(updated) };
}
