import { createJob, listActiveJobs, getPublicJob, reportJob } from "../services/jobService.js";
import {
  listEmployerJobs,
  getEmployerJob,
  updateEmployerJob,
  closeEmployerJob,
  reopenEmployerJob,
  fillEmployerJob,
  completeEmployerJob,
  deleteEmployerJob,
} from "../services/employerJobService.js";
import { validateNewJob } from "../validators/jobValidators.js";
import { sendError } from "../utils/httpError.js";

export async function postJob(req, res) {
  try {
    const fields = validateNewJob(req.body);
    res.status(201).json(await createJob(req.auth.id, fields));
  } catch (err) {
    sendError(res, err, "Failed to post job");
  }
}

export async function listJobs(req, res) {
  try {
    res.json(await listActiveJobs());
  } catch (err) {
    sendError(res, err, "Failed to fetch jobs");
  }
}

export async function getJobById(req, res) {
  try {
    res.json(await getPublicJob(req.params.id, req.auth));
  } catch (err) {
    sendError(res, err, "Failed to fetch job");
  }
}

export async function report(req, res) {
  try {
    res.json(await reportJob(req.params.id, req.body));
  } catch (err) {
    sendError(res, err, "Could not submit report");
  }
}

// ── Employer job management (identity always comes from the verified token) ──
const handler = (fn, fallback) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    sendError(res, err, fallback);
  }
};

export const myJobs = handler((req) => listEmployerJobs(req.auth.id), "Failed to load your jobs");
export const myJob = handler((req) => getEmployerJob(req.auth.id, req.params.id), "Failed to load the job");
export const editJob = handler((req) => updateEmployerJob(req.auth.id, req.params.id, req.body || {}), "Failed to update the job");
export const closeJob = handler((req) => closeEmployerJob(req.auth.id, req.params.id, req.body || {}), "Failed to close the job");
export const reopenJob = handler((req) => reopenEmployerJob(req.auth.id, req.params.id), "Failed to reopen the job");
export const fillJob = handler((req) => fillEmployerJob(req.auth.id, req.params.id, req.body || {}), "Failed to mark the job as filled");
export const completeJob = handler((req) => completeEmployerJob(req.auth.id, req.params.id), "Failed to complete the job");
export const removeJob = handler((req) => deleteEmployerJob(req.auth.id, req.params.id), "Failed to delete the job");
