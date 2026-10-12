import Job from "../models/Job.js";
import { HttpError } from "../utils/httpError.js";

// Employers type a job in one language; it is stored for every supported language.
const everyLanguage = (value) => ({ en: value, hi: value, mr: value });

export function createJob(employerId, body) {
  const { jobTitle, description, skills, location, latitude, longitude, salary, paymentMethod, isUrgent } = body;
  return Job.create({
    jobTitle: everyLanguage(jobTitle),
    description: everyLanguage(description),
    skills: everyLanguage(skills),
    location: everyLanguage(location),
    latitude,
    longitude,
    salary,
    paymentMethod,
    isUrgent,
    employer: employerId, // always the authenticated employer, never a client-supplied id
    status: "active",
  });
}

export function listActiveJobs() {
  return Job.find({ status: "active" }).sort({ createdAt: -1 });
}

export async function getJob(id) {
  const job = await Job.findById(id);
  if (!job) throw new HttpError(404, "Job not found");
  return job;
}

export async function reportJob(id, { reason, reporterPhone }) {
  await getJob(id);
  // In production: store in a Reports collection. For now: log it.
  console.log(`🚨 Job reported: ${id} | Reason: ${reason} | Reporter: ${reporterPhone}`);
  return { success: true, message: "Report submitted. We will review this job." };
}
