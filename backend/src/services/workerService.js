import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { HttpError } from "../utils/httpError.js";
import { notifyApplicationCreated } from "./notificationService.js";
import { shapeForWorker } from "./applicationService.js";
import { getEmployerSummaries } from "./workLifecycleService.js";
import { assertJobOpen, healJobStatus } from "./vacancyService.js";
import { distanceKm } from "../utils/geo.js";

const NEARBY_RADIUS_KM = 20;

export async function getProfile(workerId) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(404, "Worker not found");

  const reviews = await Application.find({
    worker: worker._id,
    isCompleted: true,
    rating: { $gt: 0 },
  });
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;
  // OTP fields are never sent to the client.
  const { otp, otpExpires, ...safe } = worker._doc;
  return {
    ...safe,
    rating: avgRating.toFixed(1),
    totalReviews: reviews.length,
  };
}

export async function updateProfile(workerId, body) {
  const { location, name, skills, gender, about, experienceYears, experienceDetails, serviceAreas, availability } = body;
  const set = {
    ...(location && { location }),
    ...(name && { name }),
    ...(skills && { skills }),
    ...((gender === "male" || gender === "female") && { gender }),
  };
  if (about !== undefined) set.about = about.trim();
  if (experienceDetails !== undefined) set.experienceDetails = experienceDetails.trim();
  const unset = {};
  if (experienceYears !== undefined) {
    if (experienceYears === null || experienceYears === "") unset.experienceYears = "";
    else set.experienceYears = Number(experienceYears);
  }
  if (serviceAreas !== undefined) set.serviceAreas = serviceAreas.map((a) => a.trim()).filter(Boolean);
  if (availability !== undefined) {
    const { isAvailable, days, from, to } = availability;
    if (isAvailable !== undefined) set["availability.isAvailable"] = isAvailable;
    if (days !== undefined) set["availability.days"] = days;
    if (from !== undefined) set["availability.from"] = from;
    if (to !== undefined) set["availability.to"] = to;
  }
  const updated = await Worker.findByIdAndUpdate(workerId, { $set: set, ...(Object.keys(unset).length && { $unset: unset }) }, { new: true }).select("-otp -otpExpires");
  if (!updated) throw new HttpError(404, "Worker not found");
  return updated;
}

// Employer contact numbers are only included for applications the employer has accepted.
export async function listMyApplications(workerId, phone) {
  const applications = await Application.find({
    $or: [{ worker: workerId }, { applicantContact: phone }],
  }).populate("job");
  const summaries = await getEmployerSummaries(applications.map((a) => a.employer));
  return applications.map((a) => ({ ...shapeForWorker(a), employerProfile: summaries.get(String(a.employer)) || { completedJobs: 0, totalReviews: 0, rating: 0 } }));
}

export async function listJobHistory(workerId) {
  const applications = await Application.find({ worker: workerId }).populate("job");
  return applications.map(shapeForWorker);
}

export async function findNearbyJobs(lat, lng) {
  if (!lat || !lng) throw new HttpError(400, "lat and lng required");
  const wLat = parseFloat(lat);
  const wLng = parseFloat(lng);
  const jobs = await Job.find({ status: "active" }).select("-contactInfo").sort({ createdAt: -1 });
  return jobs.filter(
    (job) =>
      job.latitude &&
      job.longitude &&
      distanceKm(wLat, wLng, job.latitude, job.longitude) <= NEARBY_RADIUS_KM,
  );
}

export async function acceptJob(workerId, jobId) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(401, "Account not found");

  await healJobStatus(jobId); // a "filled" job with a free vacancy reopens
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");
  assertJobOpen(job); // filled / closed jobs take no new applications

  const existing = await Application.findOne({ job: jobId, worker: workerId });
  if (existing) throw new HttpError(400, "Already accepted");

  let application;
  try {
    application = await Application.create({
      job: jobId,
      employer: job.employer,
      worker: workerId,
      applicantName: worker.name || "",
      applicantContact: worker.phone || "",
      message: "",
      isCompleted: false,
    });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(400, "Already accepted");
    throw err;
  }
  await notifyApplicationCreated(application, job);
  return application;
}

export async function updateLocation(workerId, lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (lat == null || lng == null || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    throw new HttpError(400, "Valid lat and lng required");
  }
  lat = la;
  lng = ln;
  await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
}
