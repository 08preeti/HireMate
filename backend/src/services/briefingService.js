/**
 * Daily Briefing Service for HireMate JARVIS.
 * Aggregates live database metrics, environmental weather conditions,
 * and user-specific action items into a morning/on-demand intelligence briefing.
 */

import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Worker from "../models/Worker.js";
import Employer from "../models/Employer.js";
import { ROLES } from "../constants/roles.js";
import { getWeatherAndAirQuality } from "./weatherService.js";
import { withVacancyCountsFor } from "./vacancyService.js";

export async function generateDailyBriefing(auth, { latitude, longitude } = {}) {
  const role = auth?.role;
  const userId = auth?.id;

  const weather = await getWeatherAndAirQuality({ latitude, longitude });

  if (role === ROLES.WORKER) {
    const worker = await Worker.findById(userId).lean();
    const name = worker?.name || "Worker";
    const skills = worker?.skills || [];

    // Find matching active jobs
    const skillRegex = skills.length ? skills.map((s) => s.trim()).join("|") : ".*";
    const matchingJobs = await Job.find({
      status: "active",
      $or: [
        { "jobTitle.en": { $regex: skillRegex, $options: "i" } },
        { "skills.en": { $regex: skillRegex, $options: "i" } },
      ],
    })
      .select("-contactInfo")
      .limit(5)
      .lean();

    const jobsWithVacancies = await withVacancyCountsFor(matchingJobs);

    // Applications breakdown
    const applications = await Application.find({
      $or: [{ worker: userId }, ...(auth.phone ? [{ applicantContact: auth.phone }] : [])],
    })
      .populate("job", "jobTitle dailyWage location")
      .sort({ updatedAt: -1 })
      .lean();

    const pendingOffers = applications.filter((a) => a.status === "accepted" || a.status === "offer");
    const activeWork = applications.filter((a) => ["confirmed", "on_the_way", "arrived"].includes(a.status));
    const pendingReviews = applications.filter((a) => a.status === "pending");

    // Build JARVIS voice readout
    let voiceText = `Good day, ${name}. Here is your HireMate morning briefing. `;
    if (weather) {
      voiceText += `Current temperature in your area is ${weather.temperature} degrees Celsius with ${weather.weatherDesc.toLowerCase()}. `;
      if (!weather.isOutdoorSafe) {
        voiceText += `Notice: ${weather.primaryAlert} `;
      }
    }

    if (pendingOffers.length > 0) {
      voiceText += `Important: You have ${pendingOffers.length} job offer${pendingOffers.length > 1 ? "s" : ""} awaiting your response! `;
    } else if (activeWork.length > 0) {
      voiceText += `You have active confirmed work today for ${activeWork[0].job?.jobTitle?.en || "your project"}. `;
    } else {
      voiceText += `There are ${jobsWithVacancies.length} recommended job opportunities matching your skills today. `;
    }

    return {
      role: "worker",
      userName: name,
      date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" }),
      voiceBriefing: voiceText,
      weather,
      metrics: {
        matchingJobsCount: jobsWithVacancies.length,
        pendingOffersCount: pendingOffers.length,
        activeWorkCount: activeWork.length,
        pendingApplicationsCount: pendingReviews.length,
      },
      actionItems: [
        ...(pendingOffers.length > 0
          ? [{ type: "urgent", text: `Review and confirm ${pendingOffers.length} job offer(s)` }]
          : []),
        ...(activeWork.length > 0
          ? [{ type: "active", text: `Navigate to job: ${activeWork[0].job?.jobTitle?.en || "Active site"}` }]
          : []),
        ...(jobsWithVacancies.length > 0
          ? [{ type: "opportunity", text: `${jobsWithVacancies.length} new jobs in ${skills.join(", ") || "your area"}` }]
          : []),
      ],
      recommendedJobs: jobsWithVacancies.slice(0, 3).map((j) => ({
        id: j._id.toString(),
        title: j.jobTitle?.en || j.jobTitle,
        dailyWage: j.dailyWage,
        location: j.location?.en || j.location,
        remainingVacancies: j.remainingVacancies ?? j.vacancies,
      })),
    };
  } else if (role === ROLES.EMPLOYER) {
    const employer = await Employer.findById(userId).lean();
    const name = employer?.name || "Contractor";

    // Employer jobs breakdown
    const jobs = await Job.find({ employer: userId }).lean();
    const activeJobs = jobs.filter((j) => j.status === "active");
    const totalVacancies = activeJobs.reduce((sum, j) => sum + (j.vacancies || 1), 0);
    const filledPositions = activeJobs.reduce((sum, j) => sum + (j.filledPositions || 0), 0);

    // Employer applications
    const activeJobIds = activeJobs.map((j) => j._id);
    const applications = await Application.find({ job: { $in: activeJobIds } })
      .populate("worker", "name skills rating")
      .populate("job", "jobTitle")
      .sort({ createdAt: -1 })
      .lean();

    const pendingReviewCount = applications.filter((a) => a.status === "pending").length;
    const activeWorkersOnSite = applications.filter((a) => ["confirmed", "on_the_way", "arrived"].includes(a.status)).length;

    let voiceText = `Welcome, ${name}. Here is your contractor daily briefing. `;
    if (weather) {
      voiceText += `Weather is currently ${weather.temperature} degrees Celsius and ${weather.weatherDesc.toLowerCase()}. `;
      if (!weather.isOutdoorSafe) {
        voiceText += `Weather warning: ${weather.primaryAlert} `;
      }
    }

    voiceText += `You have ${activeJobs.length} active job postings with ${filledPositions} of ${totalVacancies} positions filled. `;
    if (pendingReviewCount > 0) {
      voiceText += `You have ${pendingReviewCount} applicant candidate${pendingReviewCount > 1 ? "s" : ""} waiting for your review. `;
    }

    return {
      role: "employer",
      userName: name,
      date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" }),
      voiceBriefing: voiceText,
      weather,
      metrics: {
        activeJobsCount: activeJobs.length,
        totalVacancies,
        filledPositions,
        remainingVacancies: Math.max(0, totalVacancies - filledPositions),
        pendingApplicantsCount: pendingReviewCount,
        activeWorkersCount: activeWorkersOnSite,
      },
      actionItems: [
        ...(pendingReviewCount > 0
          ? [{ type: "urgent", text: `Review ${pendingReviewCount} applicant(s) waiting for response` }]
          : []),
        ...(activeWorkersOnSite > 0
          ? [{ type: "active", text: `Monitor ${activeWorkersOnSite} active worker(s) on-site or en route` }]
          : []),
        ...(activeJobs.length === 0
          ? [{ type: "info", text: "Create a job post to recruit daily-wage workers" }]
          : []),
      ],
    };
  }

  return null;
}
