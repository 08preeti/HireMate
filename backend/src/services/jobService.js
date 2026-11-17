import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { ROLES } from "../constants/roles.js";
import { withVacancyCounts, withVacancyCountsFor } from "./vacancyService.js";
import { HttpError } from "../utils/httpError.js";
import { notifyMatchingWorkers } from "./notificationService.js";
import { composeDescription } from "../constants/jobRules.js";
import { loggable } from "../utils/privacy.js";
import { resolvePhotos } from "./jobPhotos.js";

// Employers type a job in one language; it is stored for every supported language.
const everyLanguage = (value) => ({ en: value, hi: value, mr: value });

export async function createJob(employerId, fields) {
  const summaryMode = fields.summary !== undefined;
  const description = summaryMode ? composeDescription(fields) : fields.description ?? "";
  const { jobTitle, skills, location, summary, vacancies, description: _legacy, photos: photoInput, ...rest } = fields;
  const photos = photoInput?.length ? resolvePhotos(photoInput) : undefined;
  const job = await Job.create({
    ...rest,
    jobTitle: everyLanguage(jobTitle),
    description: everyLanguage(description),
    skills: everyLanguage(skills ?? ""),
    location: everyLanguage(location),
    ...(summaryMode && { summary }),
    vacancies,
    filledPositions: 0,
    ...(photos && { photos, photoCount: photos.length }),
    employer: employerId, // always the authenticated employer, never a client-supplied id
    status: "active",
  });
  notifyMatchingWorkers(job); // fire-and-forget, never blocks or fails the post
  const { photos: _bytes, ...plain } = withVacancyCounts(job); // never send image bytes back in JSON
  return plain;
}

// Public listings never include the employer's private contact number.
export async function listActiveJobs() {
  const jobs = await Job.find({ status: "active" }).select("-contactInfo").sort({ createdAt: -1 });
  return withVacancyCountsFor(jobs);
}

// Public job details. The employer's contact number is added only for a worker whose
// application for THIS job the employer has accepted (the verified identity decides, never the client).
export async function getPublicJob(id, auth) {
  const job = await Job.findById(id).select("-contactInfo");
  if (!job) throw new HttpError(404, "Job not found");
  if (auth?.role !== ROLES.WORKER) return (await withVacancyCountsFor([job]))[0];

  const mine = [{ worker: auth.id }];
  if (auth.phone) mine.push({ applicantContact: auth.phone });
  const accepted = await Application.exists({
    job: job._id,
    $or: mine,
    status: { $in: ["accepted", "confirmed", "on_the_way", "arrived", "completed"] },
  });
  if (!accepted) return (await withVacancyCountsFor([job]))[0];

  const withContact = (await withVacancyCountsFor([job]))[0];
  withContact.contactInfo = (await Job.findById(id).select("contactInfo").lean())?.contactInfo || "";
  return withContact;
}

export async function getJob(id) {
  const job = await Job.findById(id);
  if (!job) throw new HttpError(404, "Job not found");
  return job;
}

export async function reportJob(id, workerId, reasonInput) {
  await getJob(id);
  if (reasonInput !== undefined && reasonInput !== null && typeof reasonInput !== "string") throw new HttpError(400, "Reason must be text");
  const reason = loggable(reasonInput, 300);
  if (reason.length < 3) throw new HttpError(400, "Please tell us why you are reporting this job");
  // Reports are written to the server log with the verified reporter id; there is no reports collection yet.
  console.log(`🚨 Job reported: ${id} | Reason: ${reason} | Reporter: ${workerId}`);
  return { success: true, message: "Report submitted. We will review this job." };
}

// One photo of a job as raw image bytes (the <img> tags of the job cards point here).
export async function getJobPhoto(id, index) {
  const i = Number(index);
  if (!mongoose.isValidObjectId(id) || !Number.isInteger(i) || i < 0) throw new HttpError(404, "Photo not found");
  const job = await Job.findById(id).select("+photos");
  const photo = job?.photos?.[i];
  if (!photo) throw new HttpError(404, "Photo not found");
  return { contentType: photo.contentType, data: photo.data };
}