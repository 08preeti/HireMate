import {
  listEmployerApplications,
  listLiveApplications,
  applyToJob,
  decideApplication,
  respondToOffer,
  updateApplicationStatus,
  setLocationConsent,
  withdrawApplication,
  cancelApplication,
  markReviewed,
  getRatingByName,
} from "../services/applicationService.js";
import { rateApplication, rateEmployer, requestCompletion, decideCompletion } from "../services/workLifecycleService.js";
import { validateApplyBody, validateCompletionDecision, validateDecision, validateLocationConsent, validateOfferResponse, validateReview, validateStatus } from "../validators/applicationValidators.js";
import { sendError } from "../utils/httpError.js";

// ── Employer ────────────────────────────────────────────────────────────────
export async function rate(req, res) {
  try {
    await rateApplication(req.auth.id, req.params.id, validateReview(req.body));
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function decide(req, res) {
  try {
    const { decision } = req.body;
    validateDecision(decision);
    const application = await decideApplication(req.auth.id, req.params.id, decision);
    res.json({ success: true, status: application.status });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function review(req, res) {
  try {
    await markReviewed(req.auth.id, req.params.id);
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
    validateApplyBody(req.body);
    const application = await applyToJob(req.auth.id, req.params.jobId, req.body);
    res.json({ success: true, application });
  } catch (err) {
    sendError(res, err, "Apply failed");
  }
}

export async function respondOffer(req, res) {
  try {
    const { response } = req.body;
    validateOfferResponse(response);
    const application = await respondToOffer(req.auth, req.params.id, response);
    res.json({ success: true, status: application.status });
  } catch (err) {
    sendError(res, err, "Server error");
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

export async function locationConsent(req, res) {
  try {
    const { consent } = req.body;
    validateLocationConsent(consent);
    const locationConsent = await setLocationConsent(req.auth, req.params.id, consent);
    res.json({ success: true, locationConsent });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function withdraw(req, res) {
  try {
    const application = await withdrawApplication(req.auth, req.params.id, req.body?.reason);
    res.json({ success: true, status: application.status });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function cancel(req, res) {
  try {
    const application = await cancelApplication(req.auth.id, req.params.id, req.body?.reason);
    res.json({ success: true, status: application.status });
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

// ── Work lifecycle ──────────────────────────────────────────────────────────
export async function completionRequest(req, res) {
  try {
    const application = await requestCompletion(req.auth, req.params.id);
    res.json({ success: true, status: application.status, completionRequestedAt: application.completionRequestedAt });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function completionDecision(req, res) {
  try {
    const application = await decideCompletion(req.auth.id, req.params.id, validateCompletionDecision(req.body));
    res.json({ success: true, status: application.status });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function reviewEmployer(req, res) {
  try {
    await rateEmployer(req.auth, req.params.id, validateReview(req.body));
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}
