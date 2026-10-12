import {
  rateApplication,
  listEmployerApplications,
  listLiveApplications,
  applyToJob,
  updateApplicationStatus,
  getRatingByName,
} from "../services/applicationService.js";
import { validateRating, validateStatus } from "../validators/applicationValidators.js";
import { sendError } from "../utils/httpError.js";

// ── Employer ────────────────────────────────────────────────────────────────
export async function rate(req, res) {
  try {
    validateRating(req.body.rating);
    await rateApplication(req.auth.id, req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function employerLive(req, res) {
  try {
    res.json({ applications: await listLiveApplications(req.auth.id) });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function employerList(req, res) {
  try {
    res.json({ applications: await listEmployerApplications(req.auth.id) });
  } catch (err) {
    sendError(res, err, "Failed");
  }
}

// ── Worker ──────────────────────────────────────────────────────────────────
export async function apply(req, res) {
  try {
    const application = await applyToJob(req.auth.id, req.params.jobId, req.body);
    res.json({ success: true, application });
  } catch (err) {
    sendError(res, err, "Apply failed");
  }
}

export async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    validateStatus(status);
    await updateApplicationStatus(req.auth, req.params.id, status);
    res.json({ success: true, status });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

// ── Employer (looking up a worker's rating) ─────────────────────────────────
export async function ratingByName(req, res) {
  try {
    res.json(await getRatingByName(req.params.name));
  } catch (err) {
    sendError(res, err, "Error");
  }
}
