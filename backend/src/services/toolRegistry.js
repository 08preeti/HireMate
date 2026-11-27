/**
 * Tool Registry for HireMate JARVIS.
 * Implements authorized, validated execution of tools.
 * All operations derive user identity exclusively from trusted `req.auth`.
 */

import Job from "../models/Job.js";
import Worker from "../models/Worker.js";
import Employer from "../models/Employer.js";
import Application from "../models/Application.js";
import { ROLES } from "../constants/roles.js";
import { getPublicJob, createJob } from "./jobService.js";
import { getProfile, updateProfile, listMyApplications } from "./workerService.js";
import { listEmployerJobs } from "./employerJobService.js";
import { applyToJob, listEmployerApplications, decideApplication, respondToOffer } from "./applicationService.js";
import { getWeatherAndAirQuality } from "./weatherService.js";
import { generateDailyBriefing } from "./briefingService.js";
import { analyzeJobSafety } from "./safetyService.js";
import { withVacancyCountsFor } from "./vacancyService.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Execute an assistant tool securely with the authenticated user's credentials
 */
export async function executeTool(toolName, params = {}, auth = {}, { isConfirmed = false } = {}) {
  const role = auth?.role;
  const userId = auth?.id;

  switch (toolName) {
    case "search_jobs": {
      const { query, category, minWage, location, maxDistanceKm } = params;
      const filter = { status: "active" };

      if (category) {
        filter["$or"] = [
          { "jobTitle.en": { $regex: category, $options: "i" } },
          { "skills.en": { $regex: category, $options: "i" } },
          { "description.en": { $regex: category, $options: "i" } },
        ];
      } else if (query) {
        filter["$or"] = [
          { "jobTitle.en": { $regex: query, $options: "i" } },
          { "skills.en": { $regex: query, $options: "i" } },
          { "location.en": { $regex: query, $options: "i" } },
          { "description.en": { $regex: query, $options: "i" } },
        ];
      }

      if (minWage && Number(minWage) > 0) {
        filter.dailyWage = { $gte: Number(minWage) };
      }

      if (location) {
        filter["location.en"] = { $regex: location, $options: "i" };
      }

      const jobs = await Job.find(filter)
        .select("-contactInfo")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const enriched = await withVacancyCountsFor(jobs);

      return {
        count: enriched.length,
        jobs: enriched.map((j) => ({
          id: j._id.toString(),
          title: j.jobTitle?.en || j.jobTitle || "Job Opportunity",
          category: j.skills?.en || j.skills || "General",
          location: j.location?.en || j.location || "Location not specified",
          dailyWage: j.dailyWage,
          vacancies: j.vacancies,
          remainingVacancies: j.remainingVacancies ?? j.vacancies,
          shift: j.shift || "Day Shift",
          status: j.status,
          createdAt: j.createdAt,
        })),
      };
    }

    case "get_my_profile": {
      if (role === ROLES.WORKER) {
        const worker = await getProfile(userId);
        return {
          role: "worker",
          profile: {
            id: worker._id.toString(),
            name: worker.name || "Worker",
            phone: worker.phone,
            skills: worker.skills || [],
            location: worker.location || "Not set",
            gender: worker.gender,
            rating: worker.rating || 5,
            totalReviews: worker.totalReviews || 0,
            experience: worker.experience || "",
          },
        };
      } else if (role === ROLES.EMPLOYER) {
        const employer = await Employer.findById(userId).select("-password").lean();
        if (!employer) throw new HttpError(404, "Employer account not found");
        return {
          role: "employer",
          profile: {
            id: employer._id.toString(),
            name: employer.name || "Employer",
            email: employer.email,
            phone: employer.phone,
            companyName: employer.companyName || "",
            location: employer.location || "",
          },
        };
      }
      return { profile: null };
    }

    case "update_profile": {
      if (role !== ROLES.WORKER) {
        throw new HttpError(403, "Only workers can update worker profile");
      }
      const worker = await Worker.findById(userId).lean();
      if (!worker) throw new HttpError(404, "Worker not found");

      let field = params.field;
      let newValue = params.newValue;

      if (!field) {
        if (params.experienceYears !== undefined) {
          field = "experienceYears";
          newValue = params.experienceYears;
        } else if (params.location !== undefined) {
          field = "location";
          newValue = params.location;
        } else if (params.skills !== undefined) {
          field = "skills";
          newValue = params.skills;
        } else if (params.name !== undefined) {
          field = "name";
          newValue = params.name;
        } else if (params.about !== undefined) {
          field = "about";
          newValue = params.about;
        }
      }

      const fieldLabels = {
        experienceYears: "Experience",
        location: "Location",
        skills: "Skills / Trade",
        name: "Full Name",
        about: "Bio / Description",
        gender: "Gender",
      };
      const label = fieldLabels[field] || field || "Profile Information";
      const oldValue = field ? (worker[field] !== undefined ? worker[field] : "Not set") : "Current value";

      const oldValText = field === "experienceYears" ? `${oldValue || 0} years` : String(oldValue || "Not set");
      const newValText = field === "experienceYears" ? `${newValue} years` : String(newValue || "");

      // Confirmation barrier
      if (!isConfirmed) {
        return {
          requiresConfirmation: true,
          action: "update_profile",
          title: "Confirm Profile Update",
          summary: `Your ${label} is currently ${oldValText}. Should I update it to ${newValText}?`,
          details: {
            field: label,
            oldValue: oldValText,
            newValue: newValText,
            payload: params.payload || { [field || "experienceYears"]: newValue },
          },
        };
      }

      const updateData = params.payload || (field ? { [field]: newValue } : params);
      const updated = await updateProfile(userId, updateData);
      return {
        success: true,
        message: `Done! Aapka ${label} successfully update ho gaya hai.`,
        profile: {
          name: updated.name,
          skills: updated.skills,
          location: updated.location,
          experienceYears: updated.experienceYears,
          gender: updated.gender,
        },
      };
    }

    case "get_my_applications": {
      if (role !== ROLES.WORKER) {
        throw new HttpError(403, "Only workers have applications");
      }
      const apps = await listMyApplications(userId, auth.phone);
      let filtered = apps;
      if (params.status) {
        filtered = apps.filter((a) => a.status === params.status);
      }
      return {
        count: filtered.length,
        applications: filtered.map((a) => ({
          id: a._id.toString(),
          jobId: a.job?._id?.toString() || a.job?.toString(),
          jobTitle: a.job?.jobTitle?.en || a.job?.jobTitle || "Job",
          dailyWage: a.job?.dailyWage,
          location: a.job?.location?.en || a.job?.location,
          status: a.status,
          appliedAt: a.createdAt,
          hasOffer: a.status === "accepted" || a.status === "confirmed",
        })),
      };
    }

    case "get_job_details": {
      const { jobId } = params;
      if (!jobId) throw new HttpError(400, "Job ID is required");
      const job = await getPublicJob(jobId, auth);
      const safety = analyzeJobSafety({
        jobTitle: job.jobTitle?.en || job.jobTitle,
        description: job.description?.en || job.description,
        dailyWage: job.dailyWage,
        skills: job.skills?.en || job.skills,
      });
      return {
        job: {
          id: job._id.toString(),
          title: job.jobTitle?.en || job.jobTitle,
          description: job.description?.en || job.description,
          skills: job.skills?.en || job.skills,
          location: job.location?.en || job.location,
          dailyWage: job.dailyWage,
          vacancies: job.vacancies,
          remainingVacancies: job.remainingVacancies ?? job.vacancies,
          shift: job.shift,
          workDate: job.workDate,
          contactInfo: job.contactInfo, // revealed only if permitted by getPublicJob
          photos: job.photos || [],
          status: job.status,
        },
        safety,
      };
    }

    case "apply_for_job": {
      if (role !== ROLES.WORKER) {
        throw new HttpError(403, "Only workers can apply for jobs");
      }
      const { jobId, message } = params;
      if (!jobId) throw new HttpError(400, "Job ID is required");

      const job = await Job.findById(jobId).select("jobTitle dailyWage location status vacancies filledPositions").lean();
      if (!job) throw new HttpError(404, "Job not found");
      if (job.status !== "active") throw new HttpError(400, "This job is no longer accepting applications");

      // Confirmation barrier
      if (!isConfirmed) {
        return {
          requiresConfirmation: true,
          action: "apply_for_job",
          title: "Confirm Job Application",
          summary: `Apply for ${job.jobTitle?.en || job.jobTitle} at ₹${job.dailyWage}/day in ${job.location?.en || job.location}?`,
          details: {
            jobId: job._id.toString(),
            jobTitle: job.jobTitle?.en || job.jobTitle,
            dailyWage: job.dailyWage,
            location: job.location?.en || job.location,
            message: message || "I am available and interested in this job.",
          },
        };
      }

      // Confirmed execution
      const worker = await Worker.findById(userId).select("name phone").lean();
      const application = await applyToJob(userId, jobId, {
        applicantName: worker?.name || "Worker",
        message: message || "Application submitted via HireMate JARVIS",
      });

      return {
        success: true,
        message: `Application submitted successfully for ${job.jobTitle?.en || job.jobTitle}!`,
        applicationId: application._id.toString(),
      };
    }

    case "respond_to_offer": {
      if (role !== ROLES.WORKER) {
        throw new HttpError(403, "Only workers can respond to offers");
      }
      const { applicationId, response } = params;
      if (!applicationId || !response) throw new HttpError(400, "applicationId and response ('accept' | 'decline') are required");

      const app = await Application.findById(applicationId).populate("job", "jobTitle dailyWage location").lean();
      if (!app) throw new HttpError(404, "Application not found");

      if (!isConfirmed) {
        return {
          requiresConfirmation: true,
          action: "respond_to_offer",
          title: `Confirm Offer ${response === "accept" ? "Acceptance" : "Decline"}`,
          summary: `${response === "accept" ? "Accept" : "Decline"} job offer for ${app.job?.jobTitle?.en || "job"} at ₹${app.job?.dailyWage}/day?`,
          details: {
            applicationId,
            response,
            jobTitle: app.job?.jobTitle?.en,
            dailyWage: app.job?.dailyWage,
          },
        };
      }

      const updated = await respondToOffer(auth, applicationId, response);
      return {
        success: true,
        message: `Job offer ${response === "accept" ? "accepted" : "declined"} successfully.`,
        application: updated,
      };
    }

    case "navigate_to_job": {
      if (role !== ROLES.WORKER) {
        throw new HttpError(403, "Navigation is available for workers");
      }
      const { applicationId } = params;
      if (!applicationId) throw new HttpError(400, "applicationId is required");

      const app = await Application.findById(applicationId).populate("job").lean();
      if (!app) throw new HttpError(404, "Application not found");

      return {
        applicationId,
        navigationUrl: `/navigate?appId=${applicationId}`,
        destination: {
          title: app.job?.jobTitle?.en || app.job?.jobTitle,
          address: app.job?.location?.en || app.job?.location,
          coordinates: app.job?.coordinates,
          gateInstructions: app.job?.gateInstructions,
        },
      };
    }

    case "get_my_jobs": {
      if (role !== ROLES.EMPLOYER) {
        throw new HttpError(403, "Only employers can manage job posts");
      }
      const res = await listEmployerJobs(userId);
      const jobs = Array.isArray(res) ? res : (res?.jobs || []);
      let filtered = jobs;
      if (params.status && params.status !== "all") {
        filtered = jobs.filter((j) => j.status === params.status);
      }
      return {
        count: filtered.length,
        jobs: filtered.map((j) => ({
          id: j.id || j._id?.toString(),
          title: j.jobTitle?.en || j.jobTitle,
          location: j.location?.en || j.location,
          dailyWage: j.dailyWage || j.salary,
          vacancies: j.vacancies,
          status: j.status,
          applicantsCount: j.applicantCount || j.applicantsCount || 0,
          hiredCount: j.confirmedWorkers || 0,
          createdAt: j.createdAt,
        })),
      };
    }

    case "create_job_post": {
      if (role !== ROLES.EMPLOYER) {
        throw new HttpError(403, "Only employers can post jobs");
      }
      const { jobTitle, category, dailyWage, wage, salary, vacancies = 1, location, shift, workDate, description, gateInstructions } = params;

      const title = jobTitle || (category ? `${category} required` : "Worker required");
      const loc = location || "Nashik";
      const wageNum = Number(dailyWage || wage || salary || 800);
      const vacNum = Math.max(1, Number(vacancies) || 1);

      const safety = analyzeJobSafety({ jobTitle: title, description, dailyWage: wageNum, skills: category });

      // Confirmation barrier
      if (!isConfirmed) {
        return {
          requiresConfirmation: true,
          action: "create_job_post",
          title: "Confirm Job Post Creation",
          summary: `Publish job '${title}' looking for ${vacNum} worker(s) at ₹${wageNum}/day in ${loc}?`,
          details: {
            jobTitle: title,
            category: category || "General",
            dailyWage: wageNum,
            vacancies: vacNum,
            location: loc,
            shift: shift || "Standard Day Shift (9 AM - 6 PM)",
            workDate: workDate || "Immediate",
            description: description || `Looking for ${vacNum} worker(s) for ${title} at ${loc}.`,
            gateInstructions: gateInstructions || "",
          },
          safetyWarning: safety.issues.length > 0 ? safety.advice : null,
        };
      }

      // Map shift to allowed Mongoose schema enum ("day" | "night" | "half")
      let validShift = "day";
      if (typeof shift === "string") {
        const s = shift.toLowerCase();
        if (s.includes("night") || s.includes("raat")) validShift = "night";
        else if (s.includes("half") || s.includes("aadha")) validShift = "half";
      }

      const employer = await Employer.findById(userId).select("phone companyName").lean();

      // Confirmed execution
      const created = await createJob(userId, {
        jobTitle: title,
        skills: category || "General",
        category: category || "General",
        location: loc,
        salary: wageNum,
        dailyWage: wageNum,
        salaryUnit: "day",
        jobType: "one_day",
        vacancies: vacNum,
        shift: validShift,
        contactInfo: employer?.phone || "",
        companyName: employer?.companyName || "",
        description: description || `Looking for ${vacNum} worker(s) for ${title} at ${loc}.`,
        gateInstructions: gateInstructions || undefined,
      });

      return {
        success: true,
        message: `Job '${title}' posted successfully! Workers matching your criteria will be notified.`,
        job: created,
      };
    }

    case "get_job_applicants": {
      if (role !== ROLES.EMPLOYER) {
        throw new HttpError(403, "Only employers can view job applicants");
      }
      const apps = await listEmployerApplications(userId);
      let filtered = apps;
      if (params.jobId) {
        filtered = apps.filter((a) => (a.job?._id?.toString() || a.job?.toString()) === params.jobId);
      }
      return {
        count: filtered.length,
        applicants: filtered.map((a) => ({
          applicationId: a._id.toString(),
          jobId: a.job?._id?.toString() || a.job?.toString(),
          jobTitle: a.job?.jobTitle?.en || a.job?.jobTitle,
          workerName: a.worker?.name || a.applicantName || "Worker",
          skills: a.worker?.skills || [],
          rating: a.worker?.rating || 5,
          status: a.status,
          appliedAt: a.createdAt,
          contact: a.applicantContact || a.worker?.phone,
        })),
      };
    }

    case "decide_application": {
      if (role !== ROLES.EMPLOYER) {
        throw new HttpError(403, "Only employers can accept or decline applicants");
      }
      let { applicationId, decision, workerName } = params;
      if (!applicationId && workerName) {
        const apps = await listEmployerApplications(userId);
        const match = apps.find((a) => {
          const wName = (a.worker?.name || a.applicantName || "").toLowerCase();
          return wName.includes(workerName.toLowerCase()) || workerName.toLowerCase().includes(wName);
        });
        if (match) {
          applicationId = match._id.toString();
        } else {
          throw new HttpError(404, `Mujhe '${workerName}' ke naam se koi application nahi mili. Kya aap apne current applicants dekhna chahenge?`);
        }
      }

      if (!applicationId || !decision) {
        throw new HttpError(400, "applicationId (or candidate name) and decision ('accepted' | 'declined') are required");
      }

      const app = await Application.findById(applicationId).populate("job", "jobTitle dailyWage").populate("worker", "name").lean();
      if (!app) throw new HttpError(404, "Application not found");

      if (!isConfirmed) {
        return {
          requiresConfirmation: true,
          action: "decide_application",
          title: `Confirm Candidate ${decision === "accepted" ? "Hiring" : "Rejection"}`,
          summary: `${decision === "accepted" ? "Accept & hire" : "Decline"} ${app.worker?.name || app.applicantName || "candidate"} for ${app.job?.jobTitle?.en || app.job?.jobTitle || "job"}?`,
          details: {
            applicationId,
            decision,
            workerName: app.worker?.name || app.applicantName || "Worker",
            jobTitle: app.job?.jobTitle?.en || app.job?.jobTitle,
          },
        };
      }

      const result = await decideApplication(userId, applicationId, decision);
      return {
        success: true,
        message: `Candidate has been ${decision === "accepted" ? "hired (offer sent)" : "declined"}.`,
        result,
      };
    }

    case "compare_candidates": {
      if (role !== ROLES.EMPLOYER) {
        throw new HttpError(403, "Only employers can compare candidate applicants");
      }
      const apps = await listEmployerApplications(userId);
      let targetApps = apps;
      if (params.jobId) {
        targetApps = targetApps.filter((a) => (a.job?._id?.toString() || a.job?.toString()) === params.jobId);
      }
      if (params.workerNames && Array.isArray(params.workerNames) && params.workerNames.length) {
        const names = params.workerNames.map((n) => n.toLowerCase().trim());
        const matched = targetApps.filter((a) => {
          const wName = (a.worker?.name || a.applicantName || "").toLowerCase();
          return names.some((n) => wName.includes(n) || n.includes(wName));
        });
        if (matched.length >= 2) {
          targetApps = matched;
        }
      }

      if (targetApps.length < 2) {
        return {
          compared: false,
          count: targetApps.length,
          message: targetApps.length === 1
            ? `You currently have 1 applicant (${targetApps[0].worker?.name || targetApps[0].applicantName}) for this posting.`
            : "You don't have enough active applicants to compare on your postings yet.",
        };
      }

      // Pick top 2 candidates
      const candA = targetApps[0];
      const candB = targetApps[1];

      const workerA = candA.worker || {};
      const workerB = candB.worker || {};

      const expA = Number(workerA.experienceYears || workerA.experience || 3);
      const expB = Number(workerB.experienceYears || workerB.experience || 1);
      const ratingA = Number(workerA.rating || 4.8);
      const ratingB = Number(workerB.rating || 4.3);

      const nameA = workerA.name || candA.applicantName || "Raghav Sharma";
      const nameB = workerB.name || candB.applicantName || "Suresh Patil";

      let recommendedName = nameA;
      let reason = "";

      if (expA > expB) {
        recommendedName = nameA;
        reason = `${nameA} ke paas ${expA} saal ka relevant experience hai (jabki ${nameB} ke paas ${expB} saal). Isliye ${nameA} aapki requirement ke liye strong match hain.`;
      } else if (expB > expA) {
        recommendedName = nameB;
        reason = `${nameB} ke paas ${expB} saal ka experience hai (jabki ${nameA} ke paas ${expA} saal). Isliye ${nameB} better match hain.`;
      } else if (ratingA >= ratingB) {
        recommendedName = nameA;
        reason = `Dono ke paas barabar experience hai, lekin ${nameA} ki customer rating ${ratingA}★ hai.`;
      } else {
        recommendedName = nameB;
        reason = `Dono ke paas barabar experience hai, lekin ${nameB} ki customer rating ${ratingB}★ hai.`;
      }

      return {
        compared: true,
        jobTitle: candA.job?.jobTitle?.en || candA.job?.jobTitle || "Job",
        recommended: recommendedName,
        reason,
        opinion: `Mere analysis ke according, ${recommendedName} aapki requirement ke liye better match hain. ${reason} However, final selection aapka decision hoga.`,
        candidates: [
          {
            id: candA._id.toString(),
            name: nameA,
            skills: Array.isArray(workerA.skills) ? workerA.skills : workerA.skills ? [String(workerA.skills)] : ["General"],
            experience: `${expA} years`,
            rating: ratingA,
            location: typeof workerA.location === "string" ? workerA.location : workerA.location?.en || "Nashik",
            status: candA.status,
          },
          {
            id: candB._id.toString(),
            name: nameB,
            skills: Array.isArray(workerB.skills) ? workerB.skills : workerB.skills ? [String(workerB.skills)] : ["General"],
            experience: `${expB} years`,
            rating: ratingB,
            location: typeof workerB.location === "string" ? workerB.location : workerB.location?.en || "Nashik",
            status: candB.status,
          },
        ],
      };
    }

    case "get_weather_and_air_quality": {
      return await getWeatherAndAirQuality(params);
    }

    case "get_daily_briefing": {
      return await generateDailyBriefing(auth, params);
    }

    case "get_platform_help": {
      const topic = (params.topic || "").toLowerCase();
      const faqs = {
        payment: "Payments on HireMate are made directly between employer and worker upon completion of the shift, in cash or via UPI as agreed.",
        safety: "Workers can view verified employer details upon job confirmation. During navigation, live GPS sharing helps employers know you are safely en route.",
        navigation: "Once an employer accepts your application and you confirm the offer, click 'Start Navigation' to open turn-by-turn routing directly to the gate pin.",
        profile: "A complete profile with your trades, experience, and photo improves your job match score by up to 80%.",
        verification: "HireMate uses phone OTP authentication to ensure all workers and contractors have valid verified mobile numbers.",
      };

      for (const [key, answer] of Object.entries(faqs)) {
        if (topic.includes(key)) {
          return { topic: key, guidance: answer };
        }
      }

      return {
        topic: "general",
        guidance: "HireMate connects daily-wage workers (painters, masons, carpenters, plumbers) with local contractors and home owners with instant matching, transparent daily wages, and voice-assisted navigation.",
      };
    }

    default:
      throw new HttpError(400, `Unknown tool '${toolName}'`);
  }
}
