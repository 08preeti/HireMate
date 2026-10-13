import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { HttpError } from "../utils/httpError.js";
import { distanceKm } from "../utils/geo.js";

const NEARBY_RADIUS_KM = 20;

export async function getProfile(workerId) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(404, "Worker not found");

  const reviews = await Application.find({ worker: worker._id, isCompleted: true });
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
  // OTP fields are never sent to the client.
  const { otp, otpExpires, ...safe } = worker._doc;
  return { ...safe, rating: avgRating.toFixed(1), totalReviews: reviews.length };
}

export async function updateProfile(workerId, { location, name, skills }) {
  const updated = await Worker.findByIdAndUpdate(
    workerId,
    { ...(location && { location }), ...(name && { name }), ...(skills && { skills }) },
    { new: true }
  ).select("-otp -otpExpires");
  if (!updated) throw new HttpError(404, "Worker not found");
  return updated;
}

export function listMyApplications(workerId, phone) {
  return Application.find({ $or: [{ worker: workerId }, { applicantContact: phone }] }).populate("job");
}

export function listJobHistory(workerId) {
  return Application.find({ worker: workerId }).populate("job");
}

export async function findNearbyJobs(lat, lng) {
  if (!lat || !lng) throw new HttpError(400, "lat and lng required");
  const wLat = parseFloat(lat);
  const wLng = parseFloat(lng);
  const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });
  return jobs.filter(
    (job) => job.latitude && job.longitude && distanceKm(wLat, wLng, job.latitude, job.longitude) <= NEARBY_RADIUS_KM
  );
}

export async function acceptJob(workerId, jobId) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(401, "Account not found");

  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");

  const existing = await Application.findOne({ job: jobId, worker: workerId });
  if (existing) throw new HttpError(400, "Already accepted");

  return Application.create({
    job: jobId,
    employer: job.employer,
    worker: workerId,
    applicantName: worker.name || "",
    applicantContact: worker.phone || "",
    message: "",
    isCompleted: false,
  });
}

export async function updateLocation(workerId, lat, lng) {
  await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
}
