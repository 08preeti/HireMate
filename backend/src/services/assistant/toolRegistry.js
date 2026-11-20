import { ROLES } from "../../constants/roles.js";
import { validateArgs } from "./schema.js";
import { HttpError } from "../../utils/httpError.js";
import { validateWorkerProfile, WEEK_DAYS } from "../../validators/workerValidators.js";
import { validateNewJob } from "../../validators/jobValidators.js";
import { JOB_TYPES, SALARY_UNITS, SHIFT_KEYS } from "../../constants/jobRules.js";

// The ONLY things the model can do. Each tool:
//   - is allowlisted per role (a worker can never see or call an employer tool),
//   - has its arguments validated (unknown keys rejected),
//   - receives the identity from the verified token (ctx.auth) — the model cannot supply or override it,
//   - calls an existing service, so ownership/privacy rules already enforced there still apply.
// The model never touches MongoDB directly.

const ROUTES = {
  [ROLES.WORKER]: {
    dashboard: "/worker-dashboard", profile: "/worker-profile", my_applications: "/my-applications",
    find_jobs: "/jobs", notifications: "/worker-notifications", help: "/worker-help", settings: "/worker-settings",
    job_offers: "/job-offers", active_work: "/active-work", work_history: "/work-history", ai_suggestions: "/ai-suggestions",
  },
  [ROLES.EMPLOYER]: {
    dashboard: "/employer-dashboard", post_job: "/post-job", my_jobs: "/employer-jobs", applications: "/applications",
    workers: "/workers", notifications: "/employer-notifications", profile: "/employer-profile",
    active_work: "/employer-active-work", completed_work: "/employer-completed-work",
  },
};
const JOB_DETAIL = { [ROLES.WORKER]: (id) => `/jobs/${id}`, [ROLES.EMPLOYER]: (id) => `/employer-jobs/${id}` };

const txt = (field) => (field && typeof field === "object" ? field.en || field.hi || field.mr || "" : field || "");
const clip = (s, n = 200) => (typeof s === "string" && s.length > n ? `${s.slice(0, n)}…` : s || "");
const id = (v) => (v ? String(v) : undefined);

function compactJob(j) {
  return {
    id: id(j._id),
    title: txt(j.jobTitle),
    location: txt(j.location) || j.city || "",
    salary: j.salary,
    salaryUnit: j.salaryUnit,
    jobType: j.jobType,
    category: j.category,
    status: j.status,
    urgent: !!j.isUrgent,
    openPositions: j.availablePositions,
  };
}

// Same eight items the profile page counts (frontend/src/lib/profileCompletion.ts).
function completeness(w = {}) {
  const f = (v) => typeof v === "string" && v.trim().length > 0;
  const items = {
    name: f(w.name), phone: f(w.phone), skills: f(w.skills), location: f(w.location), about: f(w.about),
    experience: (w.experienceYears ?? 0) > 0 || f(w.experienceDetails),
    preferredLocations: (w.serviceAreas ?? []).length > 0,
    availability: (w.availability?.days ?? []).length > 0,
  };
  const done = Object.values(items).filter(Boolean).length;
  return { percent: Math.round((done / 8) * 100), missing: Object.entries(items).filter(([, ok]) => !ok).map(([k]) => k) };
}

// ── Phase 5 form helpers ─────────────────────────────────────────────────────
// Both form tools reuse the app's OWN validators and services (validateWorkerProfile / updateProfile,
// validateNewJob / createJob), so the assistant can never store anything the screens would reject.
const DAY_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const JOB_TYPE_LABEL = { one_day: "One day", multi_day: "Multiple days", part_time: "Part time", full_time: "Full time", contract: "Contract" };
const SHIFT_LABEL = { day: "Day", night: "Night", half: "Half day" };
const TIME_PATTERN = "^([01]\\d|2[0-3]):[0-5]\\d$";

const PROFILE_FIELDS = [
  ["name", "Name"], ["skills", "Skills"], ["location", "Location"], ["about", "About me"],
  ["experienceYears", "Experience"], ["experienceDetails", "Work experience"], ["serviceAreas", "Preferred areas"],
  ["availableDays", "Working days"], ["availableFrom", "Available from"], ["availableTo", "Available until"], ["isAvailable", "Available for work"],
];

function currentProfileValues(p = {}) {
  return {
    name: p.name, skills: p.skills, location: p.location, about: p.about,
    experienceYears: p.experienceYears, experienceDetails: p.experienceDetails, serviceAreas: p.serviceAreas ?? [],
    availableDays: WEEK_DAYS.filter((d) => (p.availability?.days ?? []).includes(d)),
    availableFrom: p.availability?.from, availableTo: p.availability?.to, isAvailable: p.availability?.isAvailable,
  };
}

const blank = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const norm = (v) => (blank(v) ? "" : Array.isArray(v) ? v.map((x) => String(x).trim()).join("|") : String(v).trim());

function showProfileValue(key, v) {
  if (blank(v)) return "not set";
  if (key === "availableDays") return v.map((d) => DAY_LABEL[d] || d).join(", ");
  if (key === "serviceAreas") return clip(v.join(", "), 90);
  if (key === "experienceYears") return `${v} year${Number(v) === 1 ? "" : "s"}`;
  if (key === "isAvailable") return v ? "Yes" : "No";
  return clip(String(v).trim(), 90);
}

/** Works out exactly what would change. Throws a user-safe HttpError if nothing changes or the result is invalid. */
function planProfileUpdate(args, current) {
  const cur = currentProfileValues(current);
  const changes = [];
  for (const [key, label] of PROFILE_FIELDS) {
    if (args[key] === undefined) continue;
    const after = key === "availableDays" ? WEEK_DAYS.filter((d) => args[key].includes(d)) : args[key];
    if (norm(cur[key]) === norm(after)) continue;
    changes.push({ key, label, before: cur[key], after });
  }
  if (!changes.length) throw new HttpError(409, "Those details are already on your profile, so there is nothing to change");

  const body = {};
  for (const { key, after } of changes) {
    if (key === "availableDays") (body.availability ||= {}).days = after;
    else if (key === "availableFrom") (body.availability ||= {}).from = after;
    else if (key === "availableTo") (body.availability ||= {}).to = after;
    else if (key === "isAvailable") (body.availability ||= {}).isAvailable = after;
    else body[key] = after;
  }
  validateWorkerProfile(body);
  // The app's validator compares start/end only when both are sent; check the combined result here.
  const from = body.availability?.from ?? cur.availableFrom, to = body.availability?.to ?? cur.availableTo;
  if ((body.availability?.from || body.availability?.to) && from && to && from >= to) throw new HttpError(400, "End time must be after start time");
  return { changes, body };
}

/** The app's own form needs exactly ten digits; it is stored as +91XXXXXXXXXX. */
function indianMobile(raw) {
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^\d{10}$/.test(d)) throw new HttpError(400, "The on-site contact number must be a 10-digit mobile number");
  return d;
}

const dateLabel = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(d);
const JUST_POSTED_MS = 10 * 60_000;

/** Builds the job exactly as the Post Job form would send it, then runs the app's own validation. */
function buildJob(args, ctx) {
  const companyName = args.companyName || ctx.user?.companyName;
  if (!companyName) throw new HttpError(400, "A company or contractor name is required");
  const { contactInfo, ...rest } = args;
  return validateNewJob({ ...rest, companyName, contactInfo: `+91${indianMobile(contactInfo)}` });
}

const objectId = { type: "string", format: "objectId", maxLength: 24 };
const limit = { type: "integer", minimum: 1, maximum: 10, default: 5 };

export function createToolRegistry(deps) {
  const W = [ROLES.WORKER], E = [ROLES.EMPLOYER], BOTH = [ROLES.WORKER, ROLES.EMPLOYER];

  const tools = [
    {
      name: "get_my_profile", roles: W,
      description: "Get the signed-in worker's own profile (skills, location, experience, availability).",
      inputSchema: { type: "object", properties: {} },
      async run({ auth }) {
        const p = await deps.getProfile(auth.id);
        return { name: p.name, skills: p.skills, location: p.location, experienceYears: p.experienceYears, about: clip(p.about, 300),
          serviceAreas: p.serviceAreas, availability: p.availability, rating: p.rating, totalReviews: p.totalReviews };
      },
    },
    {
      name: "check_profile_completeness", roles: W,
      description: "Report how complete the worker's profile is and which parts are missing.",
      inputSchema: { type: "object", properties: {} },
      async run({ auth }) { return completeness(await deps.getProfile(auth.id)); },
    },
    {
      name: "search_jobs", roles: W,
      description: "Search open jobs. Matches words in the job title, skills, category and location. Call with no arguments for the newest jobs.",
      inputSchema: { type: "object", properties: {
        query: { type: "string", maxLength: 80, description: "Trade or keywords, e.g. electrician" },
        location: { type: "string", maxLength: 80, description: "City or area" },
        limit,
      } },
      async run(_ctx, { query = "", location = "", limit: n }) {
        const words = `${query} ${location}`.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1);
        const jobs = await deps.listActiveJobs();
        const scored = jobs.map((j) => {
          const hay = [j.jobTitle, j.skills, j.location].flatMap((f) => (f && typeof f === "object" ? Object.values(f) : [f]))
            .concat([j.category, j.city]).join(" ").toLowerCase();
          return { j, score: words.filter((w) => hay.includes(w)).length };
        }).filter((x) => !words.length || x.score > 0);
        scored.sort((a, b) => b.score - a.score);
        const picked = scored.slice(0, n).map((x) => compactJob(x.j));
        return { total: scored.length, jobs: picked, shown: picked.map((j) => ({ kind: "job", id: j.id, title: j.title })) };
      },
    },
    {
      name: "get_job_details", roles: W,
      description: "Get full details of one job by its id (ids come from search_jobs results or the 'recently shown' list).",
      inputSchema: { type: "object", properties: { jobId: objectId }, required: ["jobId"] },
      async run({ auth }, { jobId }) {
        const j = await deps.getPublicJob(jobId, auth);
        return { ...compactJob(j), description: clip(txt(j.description), 600), skills: txt(j.skills), experience: j.experience,
          paymentMethod: j.paymentMethod, shift: j.shift, duration: j.duration, startDate: j.startDate, companyName: j.companyName };
      },
    },
    {
      name: "get_my_applications", roles: W,
      description: "List the worker's own job applications and their current status.",
      inputSchema: { type: "object", properties: { limit } },
      async run({ auth, user }, { limit: n }) {
        const apps = await deps.listMyApplications(auth.id, user?.phone ?? auth.phone);
        apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const rows = apps.slice(0, n).map((a) => ({ applicationId: id(a._id), jobId: id(a.job?._id), jobTitle: txt(a.job?.jobTitle), status: a.status, appliedAt: a.createdAt }));
        return { total: apps.length, applications: rows, shown: rows.map((r) => ({ kind: "application", id: r.applicationId, title: r.jobTitle })) };
      },
    },
    {
      name: "get_dashboard_summary", roles: E,
      description: "Summary of the employer's recruitment: total jobs, total applications, and per-status counts.",
      inputSchema: { type: "object", properties: {} },
      async run({ auth }) {
        const d = await deps.getDashboard(auth.id);
        return { totalJobs: d.totalJobs, totalApplications: d.totalApplications, stats: d.stats };
      },
    },
    {
      name: "get_my_jobs", roles: E,
      description: "List the employer's own posted jobs with application counts.",
      inputSchema: { type: "object", properties: { status: { type: "string", enum: ["active", "closed", "filled", "completed"] }, limit } },
      async run({ auth }, { status, limit: n }) {
        const { jobs } = await deps.listEmployerJobs(auth.id);
        const rows = jobs.filter((j) => !status || j.status === status).slice(0, n)
          .map((j) => ({ ...compactJob(j), applications: j.applicationCount, vacancies: j.vacancies, filled: j.filledPositions }));
        return { jobs: rows, shown: rows.map((r) => ({ kind: "job", id: r.id, title: r.title })) };
      },
    },
    {
      name: "get_applications", roles: E,
      description: "List applications received for the employer's own jobs, optionally for one job or one status.",
      inputSchema: { type: "object", properties: {
        jobId: objectId,
        status: { type: "string", enum: ["pending", "accepted", "declined", "confirmed", "rejected", "on_the_way", "arrived", "completed", "withdrawn", "cancelled"] },
        limit,
      } },
      async run({ auth }, { jobId, status, limit: n }) {
        // listEmployerApplications already filters by employer id and applies the contact/GPS privacy rules.
        const all = await deps.listEmployerApplications(auth.id);
        const rows = all.filter((a) => (!jobId || id(a.job?._id) === jobId) && (!status || a.status === status)).slice(0, n)
          .map((a) => ({ applicationId: id(a._id), jobId: id(a.job?._id), jobTitle: txt(a.job?.jobTitle), status: a.status,
            applicant: a.worker?.name || a.applicantName, skills: a.worker?.skills, location: a.worker?.location,
            rating: a.worker?.rating, appliedAt: a.createdAt, note: clip(a.message, 160) }));
        return { total: all.length, applications: rows, shown: rows.map((r) => ({ kind: "application", id: r.applicationId, title: `${r.applicant || "Applicant"} — ${r.jobTitle}` })) };
      },
    },

    // ── Write tools ─────────────────────────────────────────────────────────────
    // `prepare` has NO side effects: it checks the request against real data and builds the confirmation card.
    // `commit` runs only after the user presses Confirm (see registry.commit); it calls the same service the app's own buttons use.
    {
      name: "apply_to_job", kind: "write", roles: W,
      description: "Prepare a job application for the worker. This does NOT submit it: the user must press Confirm on a card.",
      inputSchema: { type: "object", properties: { jobId: objectId, message: { type: "string", maxLength: 500, description: "Optional note to the employer" } }, required: ["jobId"] },
      async prepare({ auth }, { jobId, message }) {
        const [job, profile, mine] = await Promise.all([deps.getPublicJob(jobId, auth), deps.getProfile(auth.id), deps.listMyApplications(auth.id, auth.phone)]);
        if (job.status !== "active") throw new HttpError(409, job.status === "filled" ? "All vacancies for this job are filled" : "This job is no longer accepting applications");
        if (job.availablePositions !== undefined && job.availablePositions < 1) throw new HttpError(409, "All vacancies for this job are filled");
        if (mine.some((a) => id(a.job?._id) === jobId)) throw new HttpError(409, "You have already applied for this job");
        if (!profile.name || !profile.phone) throw new HttpError(400, "Please add your name to your profile before applying");
        return {
          title: "Apply for this job?", confirmLabel: "Submit application",
          summary: `${txt(job.jobTitle)} — ${txt(job.location) || job.city || "location not set"}`,
          details: [
            { label: "Job", value: txt(job.jobTitle) },
            { label: "Pay", value: job.salary ? `₹${job.salary}${job.salaryUnit ? ` per ${job.salaryUnit}` : ""}` : "Not stated" },
            { label: "Applying as", value: profile.name },
            ...(message ? [{ label: "Your note", value: message }] : []),
          ],
          jobTitle: txt(job.jobTitle),
        };
      },
      async commit({ auth }, { jobId, message }, prep) {
        await deps.applyToJob(auth.id, jobId, { message });
        return `Your application for ${prep.jobTitle} has been submitted.`;
      },
    },
    {
      name: "withdraw_application", kind: "write", roles: W,
      description: "Prepare withdrawing one of the worker's own applications. Needs the user's confirmation.",
      inputSchema: { type: "object", properties: { applicationId: objectId }, required: ["applicationId"] },
      async prepare({ auth }, { applicationId }) {
        const app = (await deps.listMyApplications(auth.id, auth.phone)).find((a) => id(a._id) === applicationId);
        if (!app) throw new HttpError(404, "Application not found");
        if (!["pending", "accepted", "confirmed"].includes(app.status)) throw new HttpError(409, `An application that is ${app.status} cannot be withdrawn`);
        return {
          title: "Withdraw this application?", confirmLabel: "Withdraw", danger: true,
          summary: `${txt(app.job?.jobTitle)} (currently ${app.status})`,
          details: [{ label: "Job", value: txt(app.job?.jobTitle) }, { label: "Status", value: app.status }, { label: "Note", value: "A withdrawn application cannot be re-submitted." }],
          jobTitle: txt(app.job?.jobTitle),
        };
      },
      async commit({ auth }, { applicationId }, prep) {
        await deps.withdrawApplication(auth, applicationId, "Withdrawn via assistant");
        return `Your application for ${prep.jobTitle} has been withdrawn.`;
      },
    },
    {
      name: "respond_to_offer", kind: "write", roles: W,
      description: "Prepare accepting (confirmed) or turning down (rejected) a job offer, i.e. an application the employer accepted. Needs the user's confirmation.",
      inputSchema: { type: "object", properties: { applicationId: objectId, response: { type: "string", enum: ["confirmed", "rejected"] } }, required: ["applicationId", "response"] },
      async prepare({ auth }, { applicationId, response }) {
        const app = (await deps.listMyApplications(auth.id, auth.phone)).find((a) => id(a._id) === applicationId);
        if (!app) throw new HttpError(404, "Application not found");
        if (app.status !== "accepted") throw new HttpError(409, "There is no open offer on this application");
        const yes = response === "confirmed";
        return {
          title: yes ? "Accept this job offer?" : "Turn down this job offer?", confirmLabel: yes ? "Accept offer" : "Turn down", danger: !yes,
          summary: txt(app.job?.jobTitle), details: [{ label: "Job", value: txt(app.job?.jobTitle) }, { label: "Your answer", value: yes ? "Accept" : "Turn down" }],
          jobTitle: txt(app.job?.jobTitle),
        };
      },
      async commit({ auth }, { applicationId, response }, prep) {
        await deps.respondToOffer(auth, applicationId, response);
        return response === "confirmed" ? `You accepted the offer for ${prep.jobTitle}.` : `You turned down the offer for ${prep.jobTitle}.`;
      },
    },
    {
      name: "decide_application", kind: "write", roles: E,
      description: "Prepare accepting (accepted = sends the worker a job offer) or declining (declined) a pending application on the employer's own job. Needs the employer's confirmation.",
      inputSchema: { type: "object", properties: { applicationId: objectId, decision: { type: "string", enum: ["accepted", "declined"] } }, required: ["applicationId", "decision"] },
      async prepare({ auth }, { applicationId, decision }) {
        const app = (await deps.listEmployerApplications(auth.id)).find((a) => id(a._id) === applicationId); // own applications only
        if (!app) throw new HttpError(404, "Application not found");
        if (app.status !== "pending") throw new HttpError(409, `This application is already ${app.status}`);
        const who = app.worker?.name || app.applicantName || "the applicant";
        const yes = decision === "accepted";
        return {
          title: yes ? "Accept this applicant?" : "Decline this applicant?", confirmLabel: yes ? "Accept & send offer" : "Decline", danger: !yes,
          summary: `${who} — ${txt(app.job?.jobTitle)}`,
          details: [{ label: "Applicant", value: who }, { label: "Job", value: txt(app.job?.jobTitle) }, { label: "Decision", value: yes ? "Accept (the worker is notified and can confirm the offer)" : "Decline (the worker is notified)" }],
          who,
        };
      },
      async commit({ auth }, { applicationId, decision }, prep) {
        await deps.decideApplication(auth.id, applicationId, decision);
        return decision === "accepted" ? `${prep.who} has been sent a job offer.` : `${prep.who}'s application has been declined.`;
      },
    },
    {
      name: "shortlist_application", kind: "write", roles: E,
      description: "Prepare marking a pending application as reviewed/shortlisted. HireMate has no separate shortlist state: this records 'reviewed' on the application timeline and does not accept or decline anyone. Needs confirmation.",
      inputSchema: { type: "object", properties: { applicationId: objectId }, required: ["applicationId"] },
      async prepare({ auth }, { applicationId }) {
        const app = (await deps.listEmployerApplications(auth.id)).find((a) => id(a._id) === applicationId);
        if (!app) throw new HttpError(404, "Application not found");
        if (app.status !== "pending") throw new HttpError(409, `This application is already ${app.status}`);
        const who = app.worker?.name || app.applicantName || "the applicant";
        return {
          title: "Mark as reviewed?", confirmLabel: "Mark reviewed", summary: `${who} — ${txt(app.job?.jobTitle)}`,
          details: [{ label: "Applicant", value: who }, { label: "Effect", value: "Adds 'reviewed' to the application timeline. The applicant is not accepted or declined." }], who,
        };
      },
      async commit({ auth }, { applicationId }, prep) {
        await deps.markReviewed(auth.id, applicationId);
        return `${prep.who}'s application is marked as reviewed.`;
      },
    },
    {
      name: "close_job", kind: "write", roles: E,
      description: "Prepare closing one of the employer's own jobs so it stops taking applications. Needs confirmation.",
      inputSchema: { type: "object", properties: { jobId: objectId }, required: ["jobId"] },
      async prepare({ auth }, { jobId }) {
        const job = (await deps.listEmployerJobs(auth.id)).jobs.find((j) => id(j._id) === jobId);
        if (!job) throw new HttpError(404, "Job not found");
        if (job.status === "closed") throw new HttpError(409, "This job is already closed");
        if (job.status === "completed") throw new HttpError(409, "A completed job cannot be closed");
        return {
          title: "Close this job?", confirmLabel: "Close job", danger: true, summary: txt(job.jobTitle),
          details: [{ label: "Job", value: txt(job.jobTitle) }, { label: "Applications", value: String(job.applicationCount ?? 0) }, { label: "Effect", value: "No new applications. Applicants are notified." }],
          jobTitle: txt(job.jobTitle),
        };
      },
      async commit({ auth }, { jobId }, prep) {
        await deps.closeEmployerJob(auth.id, jobId, {});
        return `${prep.jobTitle} has been closed.`;
      },
    },
    {
      name: "reopen_job", kind: "write", roles: E,
      description: "Prepare reopening one of the employer's own closed jobs. Needs confirmation.",
      inputSchema: { type: "object", properties: { jobId: objectId }, required: ["jobId"] },
      async prepare({ auth }, { jobId }) {
        const job = (await deps.listEmployerJobs(auth.id)).jobs.find((j) => id(j._id) === jobId);
        if (!job) throw new HttpError(404, "Job not found");
        if (job.status === "active") throw new HttpError(409, "This job is already open");
        if (job.status === "completed") throw new HttpError(409, "A completed job cannot be reopened");
        return { title: "Reopen this job?", confirmLabel: "Reopen job", summary: txt(job.jobTitle), details: [{ label: "Job", value: txt(job.jobTitle) }, { label: "Current status", value: job.status }], jobTitle: txt(job.jobTitle) };
      },
      async commit({ auth }, { jobId }, prep) {
        await deps.reopenEmployerJob(auth.id, jobId);
        return `${prep.jobTitle} is open again.`;
      },
    },
    {
      name: "update_my_profile", kind: "write", roles: W, affects: "profile",
      description: "Prepare changes to the signed-in worker's OWN profile. Include ONLY the fields the user asked to change, using their words; never invent or guess values. This does NOT save anything: the user must press Confirm on a card that shows each before → after. Phone number and gender cannot be changed this way.",
      inputSchema: { type: "object", properties: {
        name: { type: "string", maxLength: 60 },
        skills: { type: "string", maxLength: 200, description: "Comma-separated skills, e.g. Electrician, Wiring" },
        location: { type: "string", maxLength: 100, description: "Home city or area" },
        about: { type: "string", maxLength: 500, description: "Short 'about me' text" },
        experienceYears: { type: "integer", minimum: 0, maximum: 60 },
        experienceDetails: { type: "string", maxLength: 500 },
        serviceAreas: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", maxLength: 60 }, description: "Areas the worker will travel to (replaces the current list)" },
        availableDays: { type: "array", minItems: 1, maxItems: 7, items: { type: "string", enum: WEEK_DAYS }, description: "Working days (replaces the current list)" },
        availableFrom: { type: "string", maxLength: 5, pattern: TIME_PATTERN, description: "24-hour HH:MM" },
        availableTo: { type: "string", maxLength: 5, pattern: TIME_PATTERN, description: "24-hour HH:MM" },
        isAvailable: { type: "boolean", description: "Whether the worker is currently open to work" },
      } },
      async prepare({ auth }, args) {
        if (!Object.keys(args).length) throw new HttpError(400, "Tell me what you want to change on your profile");
        const { changes, body } = planProfileUpdate(args, await deps.getProfile(auth.id));
        return {
          title: "Update your profile?", confirmLabel: "Save changes",
          summary: `${changes.length} change${changes.length > 1 ? "s" : ""}: ${changes.map((c) => c.label).join(", ")}`,
          details: changes.map((c) => ({ label: c.label, value: `${showProfileValue(c.key, c.before)} → ${showProfileValue(c.key, c.after)}` })),
          body, labels: changes.map((c) => c.label),
        };
      },
      async commit({ auth }, _args, prep) {
        await deps.updateProfile(auth.id, prep.body);
        return `Your profile has been updated (${prep.labels.join(", ")}).`;
      },
    },
    {
      name: "post_job", kind: "write", roles: E, affects: "jobs",
      description: "Prepare PUBLISHING a new job for the employer. Required: jobTitle, location (site address), salary, salaryUnit and contactInfo (10-digit on-site mobile number). companyName defaults to the employer's account name. If any required value is missing, ASK the user first; never guess pay, phone numbers, addresses or dates. Does NOT publish: the employer must press Confirm on a card. A map pin and photos cannot be set here.",
      inputSchema: { type: "object", required: ["jobTitle", "location", "salary", "salaryUnit", "contactInfo"], properties: {
        jobTitle: { type: "string", maxLength: 150 },
        location: { type: "string", maxLength: 400, description: "Site address in words" },
        salary: { type: "number", minimum: 1, maximum: 10000000, description: "Pay amount per worker in rupees" },
        salaryUnit: { type: "string", enum: SALARY_UNITS },
        contactInfo: { type: "string", maxLength: 20, description: "10-digit on-site mobile number" },
        companyName: { type: "string", maxLength: 120 },
        vacancies: { type: "integer", minimum: 1, maximum: 500, default: 1, description: "Workers needed" },
        summary: { type: "string", maxLength: 3000, description: "Job description in the employer's words" },
        skills: { type: "string", maxLength: 300 },
        category: { type: "string", maxLength: 80 },
        experience: { type: "string", maxLength: 200 },
        jobType: { type: "string", enum: JOB_TYPES },
        shift: { type: "string", enum: SHIFT_KEYS },
        startDate: { type: "string", maxLength: 10, pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "YYYY-MM-DD, today or later" },
        duration: { type: "string", maxLength: 100 },
        paymentMethod: { type: "string", maxLength: 40 },
        city: { type: "string", maxLength: 80 },
        state: { type: "string", maxLength: 80 },
        isUrgent: { type: "boolean" },
      } },
      async prepare(ctx, args) {
        const fields = buildJob(args, ctx);
        const { jobs } = await deps.listEmployerJobs(ctx.auth.id);
        const same = jobs.find((j) => j.status === "active" && txt(j.jobTitle).trim().toLowerCase() === fields.jobTitle.toLowerCase() && txt(j.location).trim().toLowerCase() === fields.location.toLowerCase());
        // Guards a double confirmation (two cards for the same job): the second one is refused once the first is live.
        if (same && Date.now() - new Date(same.createdAt).getTime() < JUST_POSTED_MS) throw new HttpError(409, "You just published this job, so I did not post it again");
        const row = (label, value) => (value ? [{ label, value: String(value) }] : []);
        return {
          title: "Publish this job?", confirmLabel: "Publish job",
          summary: `${fields.jobTitle} — ${clip(fields.location, 60)}`,
          details: [
            { label: "Job", value: fields.jobTitle }, { label: "Company", value: fields.companyName }, { label: "Location", value: clip(fields.location, 120) },
            { label: "Pay", value: `₹${fields.salary} per ${fields.salaryUnit}` }, { label: "Workers", value: String(fields.vacancies) },
            ...row("Start date", fields.startDate && dateLabel(fields.startDate)), ...row("Job type", JOB_TYPE_LABEL[fields.jobType]), ...row("Shift", SHIFT_LABEL[fields.shift]),
            ...row("Skills", fields.skills), ...row("Category", fields.category), ...row("Duration", fields.duration), ...row("Description", clip(fields.summary, 160)),
            ...(fields.isUrgent ? [{ label: "Urgent", value: "Yes" }] : []),
            { label: "Contact", value: `${fields.contactInfo} (shown only to workers you accept)` },
            { label: "Map pin", value: "Not set. Add the exact gate pin from Edit job so workers can get directions." },
            ...(same ? [{ label: "Heads-up", value: "You already have an active job with this title and address." }] : []),
          ],
          fields, jobTitle: fields.jobTitle,
        };
      },
      async commit({ auth }, _args, prep) {
        await deps.createJob(auth.id, prep.fields);
        return `${prep.jobTitle} is now published. Open it from My Jobs to add the map pin.`;
      },
    },
    {
      name: "navigate", roles: BOTH,
      description: "Open a page in the app for the user. Only the listed destinations exist. Use job_details with a jobId to open one job.",
      inputSchema: { type: "object", properties: {
        destination: { type: "string", enum: [...new Set([...Object.keys(ROUTES.worker), ...Object.keys(ROUTES.employer), "job_details"])] },
        jobId: objectId,
      }, required: ["destination"] },
      async run({ auth }, { destination, jobId }) {
        let path;
        if (destination === "job_details") {
          if (!jobId) throw new Error("jobId is required for job_details");
          path = JOB_DETAIL[auth.role](jobId);
        } else path = ROUTES[auth.role][destination];
        if (!path) throw new Error(`"${destination}" is not available for your account`);
        return { opened: destination, clientAction: { type: "navigate", path } };
      },
    },
  ];

  const byName = new Map(tools.map((t) => [t.name, t]));
  return {
    /** Tool definitions the model may see for this role (and only this role). */
    forRole: (role) => tools.filter((t) => t.roles.includes(role)),
    /** Runs one tool call. Never throws: failures come back as { ok:false, error } for the model to explain.
     *  Write tools only PREPARE here: nothing changes until registry.commit() is called after the user confirms. */
    async execute(ctx, name, rawArgs) {
      const tool = byName.get(name);
      if (!tool || !tool.roles.includes(ctx.auth.role)) return { ok: false, error: `Unknown tool "${name}"` };
      let args;
      try { args = validateArgs(tool.inputSchema, rawArgs); } catch (e) { return { ok: false, error: `Invalid arguments: ${e.message}` }; }
      try {
        if (tool.kind === "write") {
          const { jobTitle: _j, who: _w, body: _b, labels: _l, fields: _f, ...card } = await tool.prepare(ctx, args);
          return {
            ok: true,
            data: { status: "awaiting_user_confirmation", summary: card.summary, note: "NOT DONE YET. A confirmation card is now shown to the user; nothing happens until they press its button." },
            pending: { tool: name, args, card },
          };
        }
        const { shown, clientAction, ...data } = await tool.run(ctx, args);
        return { ok: true, data, shown, clientAction };
      } catch (e) {
        return failure(name, e);
      }
    },
    /** Executes a previously prepared write action. Re-validates, re-authorizes and re-checks current state first. */
    async commit(ctx, name, rawArgs) {
      const tool = byName.get(name);
      if (!tool || tool.kind !== "write" || !tool.roles.includes(ctx.auth.role)) return { ok: false, error: "This action is not available" };
      try {
        const args = validateArgs(tool.inputSchema, rawArgs);
        const prep = await tool.prepare(ctx, args); // state may have changed since the card was shown
        const message = await tool.commit(ctx, args, prep);
        return { ok: true, message, ...(tool.affects && { affects: tool.affects }) }; // tells the open page what to reload
      } catch (e) {
        return failure(name, e);
      }
    },
  };
}

function failure(name, e) {
  if (e?.status && e.status < 500) return { ok: false, error: e.message }; // HttpError text is already user-safe
  console.error(`[assistant] tool ${name} failed:`, e?.message);
  return { ok: false, error: "That could not be completed right now" };
}

/** Real services, imported lazily so unit tests can inject fakes without loading Mongoose models. */
export async function defaultDeps() {
  const [{ getProfile, listMyApplications, updateProfile }, { listActiveJobs, getPublicJob, createJob }, { getDashboard }, { listEmployerJobs, closeEmployerJob, reopenEmployerJob }, apps] = await Promise.all([
    import("../workerService.js"), import("../jobService.js"), import("../employerService.js"),
    import("../employerJobService.js"), import("../applicationService.js"),
  ]);
  const { listEmployerApplications, applyToJob, withdrawApplication, respondToOffer, decideApplication, markReviewed } = apps;
  return {
    getProfile, listMyApplications, listActiveJobs, getPublicJob, getDashboard, listEmployerJobs, listEmployerApplications,
    applyToJob, withdrawApplication, respondToOffer, decideApplication, markReviewed, closeEmployerJob, reopenEmployerJob,
    updateProfile, createJob,
  };
}
