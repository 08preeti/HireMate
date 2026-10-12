import { createJob, listActiveJobs, getJob, reportJob } from "../services/jobService.js";
import { validateNewJob } from "../validators/jobValidators.js";
import { sendError } from "../utils/httpError.js";

export async function postJob(req, res) {
  try {
    validateNewJob(req.body);
    res.status(201).json(await createJob(req.auth.id, req.body));
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
    res.json(await getJob(req.params.id));
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
