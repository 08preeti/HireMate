import { sendWorkerOtp, verifyWorkerOtp, registerWorker } from "../services/workerAuthService.js";
import { validatePhone, validateOtpVerify } from "../validators/authValidators.js";
import { sendError } from "../utils/httpError.js";

export async function sendOtp(req, res) {
  try {
    validatePhone(req.body.phone);
    res.json(await sendWorkerOtp(req.body.phone));
  } catch (err) {
    sendError(res, err, "Failed to send OTP");
  }
}

export async function verifyOtp(req, res) {
  try {
    validateOtpVerify(req.body);
    res.json(await verifyWorkerOtp(req.body));
  } catch (err) {
    sendError(res, err, "Verification failed");
  }
}

export async function register(req, res) {
  try {
    res.json(await registerWorker(req.body));
  } catch (err) {
    sendError(res, err, "Worker registration failed");
  }
}
