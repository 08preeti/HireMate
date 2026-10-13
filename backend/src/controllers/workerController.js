import {
  getProfile,
  updateProfile,
  listMyApplications,
  listJobHistory,
  findNearbyJobs,
  acceptJob,
  updateLocation,
} from "../services/workerService.js";
import { HttpError, sendError } from "../utils/httpError.js";

// A worker may only touch their own resources. The id in the URL/body is
// compared with the id from the verified token — never trusted by itself.
function assertSelf(req, id, message) {
  if (req.auth.id !== id) throw new HttpError(403, message);
}

export async function profile(req, res) {
  try {
    assertSelf(req, req.params.id, "Not authorized to view this profile");
    res.json(await getProfile(req.params.id));
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function update(req, res) {
  try {
    assertSelf(req, req.params.id, "Not authorized to update this profile");
    res.json(await updateProfile(req.params.id, req.body));
  } catch (err) {
    sendError(res, err, "Update failed");
  }
}

export async function myJobs(req, res) {
  try {
    if (req.auth.phone !== req.params.phone) {
      throw new HttpError(403, "Not authorized to view these applications");
    }
    res.json(await listMyApplications(req.auth.id, req.params.phone));
  } catch (err) {
    sendError(res, err, "Failed to fetch jobs");
  }
}

export async function jobAlerts(req, res) {
  try {
    res.json(await findNearbyJobs(req.query.lat, req.query.lng));
  } catch (err) {
    sendError(res, err, "Failed to fetch alerts");
  }
}

export async function accept(req, res) {
  try {
    assertSelf(req, req.body.workerId, "Not authorized");
    const application = await acceptJob(req.auth.id, req.body.jobId);
    res.json({ message: "Job Accepted", applicationId: application._id });
  } catch (err) {
    sendError(res, err, "Server error");
  }
}

export async function jobHistory(req, res) {
  try {
    assertSelf(req, req.params.workerId, "Not authorized");
    res.json(await listJobHistory(req.params.workerId));
  } catch (err) {
    sendError(res, err, "Error");
  }
}

export async function location(req, res) {
  try {
    assertSelf(req, req.body.workerId, "Not authorized");
    await updateLocation(req.auth.id, req.body.lat, req.body.lng);
    res.json({ message: "Location updated" });
  } catch (err) {
    sendError(res, err, "Failed");
  }
}
