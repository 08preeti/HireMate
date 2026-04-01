/*import express from "express";
import Job from "../models/Job.js";
 
const router = express.Router();
 
const SKILL_GROUPS = {
  electrician: ["electrician", "electric", "wiring", "electrical", "wireman"],
  plumber:     ["plumber", "plumbing", "pipe", "drainage"],
  carpenter:   ["carpenter", "carpentry", "woodwork", "furniture"],
  painter:     ["painter", "painting", "colour", "color", "wall"],
  cook:        ["cook", "chef", "cooking", "kitchen", "food", "catering"],
  driver:      ["driver", "driving", "vehicle", "transport", "chauffeur"],
  cleaner:     ["cleaner", "cleaning", "sweeper", "housekeeping", "maid"],
  security:    ["security", "guard", "watchman"],
  gardener:    ["gardener", "garden", "mali", "plant"],
  delivery:    ["delivery", "courier", "dispatch", "parcel"],
  mechanic:    ["mechanic", "repair", "automobile", "bike"],
  welder:      ["welder", "welding", "fabricator"],
  mason:       ["mason", "masonry", "construction", "bricklayer", "concrete"],
  helper:      ["helper", "labour", "labor", "worker", "assistant"],
  waiter:      ["waiter", "server", "hotel", "restaurant"],
};
 
function scoreSkill(workerSkills, jobSkills) {
  if (!workerSkills || !jobSkills) return 0;
  const w = workerSkills.toLowerCase();
  const j = (jobSkills + " ").toLowerCase();
  for (const ws of w.split(/[,\s]+/)) {
    if (ws.length < 2) continue;
    if (j.includes(ws)) return 40;
  }
  for (const [, synonyms] of Object.entries(SKILL_GROUPS)) {
    if (synonyms.some(s => w.includes(s)) && synonyms.some(s => j.includes(s))) return 35;
  }
  const wT = w.split(/[,\s]+/).filter(t => t.length > 2);
  const jT = j.split(/[,\s]+/).filter(t => t.length > 2);
  if (wT.some(t => jT.some(j => j.includes(t) || t.includes(j)))) return 20;
  return 0;
}
 
function scoreLocation(workerLoc, jobLoc) {
  if (!workerLoc || !jobLoc) return 5;
  const w = workerLoc.toLowerCase();
  const j = jobLoc.toLowerCase();
  if (w === j) return 30;
  const wP = w.split(/[,\s]+/).filter(p => p.length > 2);
  const jP = j.split(/[,\s]+/).filter(p => p.length > 2);
  for (const wp of wP) {
    for (const jp of jP) {
      if (wp === jp) return 28;
      if (wp.includes(jp) || jp.includes(wp)) return 22;
    }
  }
  return 5;
}
 
function scoreBonus(job) {
  let b = 0;
  if (job.isUrgent) b += 15;
  if (job.salary >= 800) b += 5;
  if (job.salary >= 1500) b += 5;
  const ageHours = (Date.now() - new Date(job.createdAt)) / 36e5;
  if (ageHours < 24) b += 10;
  else if (ageHours < 72) b += 5;
  if (job.paymentMethod === "Cash") b += 3;
  return b;
}
 
function buildReason(skills, location, job, skillScore, locationScore) {
  const parts = [];
  const title = job.jobTitle?.en || "this job";
  const loc   = job.location?.en || "nearby";
  if (skillScore >= 35)      parts.push(`Your ${skills} skills are a great match for this ${title} role.`);
  else if (skillScore >= 20) parts.push(`Your skills are closely related to what this ${title} position needs.`);
  else                       parts.push(`This ${title} role is open to workers with general skills like yours.`);
  if (locationScore >= 28)   parts.push(`The job is in ${loc} — same area as you, so no long travel needed.`);
  else if (locationScore >= 20) parts.push(`The job is in ${loc}, which is close to your location.`);
  if (job.isUrgent)          parts.push(`This employer needs someone urgently — great chance to get hired fast.`);
  if (job.salary >= 1500)    parts.push(`The salary of ₹${job.salary} is above average for this type of work.`);
  else if (job.salary >= 800) parts.push(`The pay of ₹${job.salary} is fair for this type of work.`);
  if (job.paymentMethod === "Cash") parts.push(`Payment is in cash — you get paid the same day.`);
  return parts.slice(0, 3).join(" ");
}
 
function buildTip(skills, job) {
  const title = (job.jobTitle?.en || "").toLowerCase();
  if (title.includes("cook") || title.includes("chef")) return "Mention any specific dishes or cuisines you know. Employers prefer cooks who are flexible with different recipes.";
  if (title.includes("driver"))   return "Mention your driving license type and years of experience. A clean record is a big plus.";
  if (title.includes("electric")) return "Tell the employer if you have domestic or commercial wiring experience. Bring your basic tools on the first day.";
  if (title.includes("plumb"))    return "Mention experience with bathroom fitting, pipeline repair, or motor installation to stand out.";
  if (title.includes("clean") || title.includes("maid")) return "Reliability and punctuality matter most. Mention if you have experience with households or offices.";
  if (title.includes("security") || title.includes("guard")) return "Mention your physical fitness and any previous security experience. Night shift availability is a bonus.";
  if (job.isUrgent) return "This is urgent — contact the employer immediately and say you are available to start today.";
  return `Call right away and say: "I have experience in ${skills} and I am available to start immediately."`;
}
 
function buildSummary(skills, location, count) {
  if (count === 0) return `No active jobs match your ${skills} skills in ${location} right now. Check back soon — new jobs are added daily.`;
  const urgentNote = count > 2 ? " Some are urgent, so act fast!" : "";
  return `Found ${count} job${count > 1 ? "s" : ""} matching your ${skills} skills in ${location}.${urgentNote} Click 'View Job & Apply' on the best match.`;
}
 
// POST /api/ai/suggestions
router.post("/suggestions", async (req, res) => {
  try {
    const { skills, location } = req.body;
    if (!skills || !location) return res.status(400).json({ error: "Skills and location are required" });
 
    const allJobs = await Job.find({ status: "active" }).sort({ createdAt: -1 }).limit(50).lean();
 
    if (allJobs.length === 0) {
      return res.json({ suggestions: [], summary: `No jobs posted yet. Check back soon!` });
    }
 
    const scored = allJobs.map(job => {
      const skillScore    = scoreSkill(skills, (job.skills?.en || "") + " " + (job.jobTitle?.en || ""));
      const locationScore = scoreLocation(location, job.location?.en || "");
      const bonusScore    = scoreBonus(job);
      return { job, skillScore, locationScore, total: skillScore + locationScore + bonusScore };
    });
 
    scored.sort((a, b) => b.total - a.total);
    // Only show jobs where skill actually matched (skillScore must be > 0)
    // This prevents Driver/Mechanic showing up for a Cook search
    const matched = scored.filter(s => s.skillScore > 0);
 
    // If no skill matches found, fall back to location-based jobs
    const pool = matched.length > 0 ? matched : scored.filter(s => s.locationScore >= 22);
 
    const top5 = pool.slice(0, 5);
 
    const suggestions = top5.map(({ job, skillScore, locationScore, total }) => ({
      jobId:         String(job._id),
      title:         job.jobTitle?.en || "Job Opening",
      location:      (() => {
        const loc = job.location?.en || "";
        if (!loc) return "Location not specified";
        // Extract short city name - take the part before first comma if long
        const parts = loc.split(",").map(p => p.trim()).filter(p => p.length > 0);
        // Find the shortest meaningful part (usually city name)
        if (parts.length >= 3) {
          // Long address - find the city part (usually 2nd or 3rd from end)
          const cityPart = parts.find(p => p.length > 2 && p.length < 25 && !/^\d/.test(p));
          return cityPart || parts[0];
        }
        return parts[0] || loc;
      })(),
      salary:        job.salary ? `₹${job.salary}` : "Negotiable",
      paymentMethod: job.paymentMethod || "",
      isUrgent:      job.isUrgent || false,
      matchScore:    Math.max(1, Math.min(10, Math.round((total / 103) * 10))),
      reason:        buildReason(skills, location, job, skillScore, locationScore),
      tip:           buildTip(skills, job),
    }));
 
    res.json({ suggestions, summary: buildSummary(skills, location, suggestions.length) });
  } catch (err) {
    console.error("AI suggestions error:", err);
    res.status(500).json({ error: "Could not generate suggestions. Please try again." });
  }
});
 
// POST /api/ai/career-tips
router.post("/career-tips", async (req, res) => {
  try {
    const { skill } = req.body;
    const s = (skill || "").toLowerCase();
    const tipMap = {
      electrician: ["Always carry your basic tools — screwdriver, tester, pliers.", "Get familiar with both domestic and commercial wiring to get more jobs.", "A small visiting card with your phone number helps employers remember you."],
      cook:        ["Know at least 3–4 cuisine styles to get more kitchen jobs.", "Hygiene matters as much as cooking skills — always maintain them.", "Mention if you can cook for large groups — bulk catering pays better."],
      driver:      ["Keep your driving license and RC book documents ready always.", "Being punctual and polite earns you repeat work and referrals.", "Learning GPS navigation apps like Google Maps increases your value."],
      plumber:     ["Practice bathroom fitting and pipeline repair as they are most in-demand.", "Keep basic tools like a pipe wrench and sealant tape with you.", "Availability on weekends and emergencies can double your income."],
      cleaner:     ["Bring your own cleaning supplies if possible — employers appreciate this.", "Offer both dry and wet cleaning to handle more types of jobs.", "Consistency and honesty are the #1 things employers look for."],
      security:    ["Physical fitness and alertness are the top requirements.", "Night shift availability earns you 20–30% more pay in most places.", "Having a basic first aid certificate makes you stand out."],
      carpenter:   ["Furniture repair and polishing work is available daily — learn both.", "Knowing how to read measurements precisely impresses employers.", "Carry photos of your past work on your phone to show employers."],
    };
    const tips = tipMap[s] || [
      `Be available on short notice — many ${skill} jobs are urgent.`,
      "Keep your phone charged and always answer unknown numbers.",
      "Ask satisfied employers for a reference to build your reputation.",
    ];
    res.json({ tips });
  } catch (err) {
    res.status(500).json({ error: "Could not load tips" });
  }
});
 
export default router;  */



import express from "express";
import Job from "../models/Job.js";

const router = express.Router();

const SKILL_GROUPS = {
  electrician: ["electrician", "electric", "wiring", "electrical", "wireman"],
  plumber:     ["plumber", "plumbing", "pipe", "drainage"],
  carpenter:   ["carpenter", "carpentry", "woodwork", "furniture"],
  painter:     ["painter", "painting", "colour", "color", "wall"],
  cook:        ["cook", "chef", "cooking", "kitchen", "food", "catering"],
  driver:      ["driver", "driving", "vehicle", "transport", "chauffeur"],
  cleaner:     ["cleaner", "cleaning", "sweeper", "housekeeping", "maid"],
  security:    ["security", "guard", "watchman"],
  gardener:    ["gardener", "garden", "mali", "plant"],
  delivery:    ["delivery", "courier", "dispatch", "parcel"],
  mechanic:    ["mechanic", "repair", "automobile", "bike"],
  welder:      ["welder", "welding", "fabricator"],
  mason:       ["mason", "masonry", "construction", "bricklayer", "concrete"],
  helper:      ["helper", "labour", "labor", "worker", "assistant"],
  waiter:      ["waiter", "server", "hotel", "restaurant"],
};

function scoreSkill(workerSkills, jobSkills) {
  if (!workerSkills || !jobSkills) return 0;
  const w = workerSkills.toLowerCase();
  const j = (jobSkills + " ").toLowerCase();
  for (const ws of w.split(/[,\s]+/)) {
    if (ws.length < 2) continue;
    if (j.includes(ws)) return 40;
  }
  for (const [, synonyms] of Object.entries(SKILL_GROUPS)) {
    if (synonyms.some(s => w.includes(s)) && synonyms.some(s => j.includes(s))) return 35;
  }
  const wT = w.split(/[,\s]+/).filter(t => t.length > 2);
  const jT = j.split(/[,\s]+/).filter(t => t.length > 2);
  if (wT.some(t => jT.some(j => j.includes(t) || t.includes(j)))) return 20;
  return 0;
}

function scoreLocation(workerLoc, jobLoc) {
  if (!workerLoc || !jobLoc) return 5;
  const w = workerLoc.toLowerCase();
  const j = jobLoc.toLowerCase();
  if (w === j) return 30;
  const wP = w.split(/[,\s]+/).filter(p => p.length > 2);
  const jP = j.split(/[,\s]+/).filter(p => p.length > 2);
  for (const wp of wP) {
    for (const jp of jP) {
      if (wp === jp) return 28;
      if (wp.includes(jp) || jp.includes(wp)) return 22;
    }
  }
  return 5;
}

function scoreBonus(job) {
  let b = 0;
  if (job.isUrgent) b += 15;
  if (job.salary >= 800) b += 5;
  if (job.salary >= 1500) b += 5;
  const ageHours = (Date.now() - new Date(job.createdAt)) / 36e5;
  if (ageHours < 24) b += 10;
  else if (ageHours < 72) b += 5;
  if (job.paymentMethod === "Cash") b += 3;
  return b;
}

function buildReason(skills, location, job, skillScore, locationScore) {
  const parts = [];
  const title = job.jobTitle?.en || "this job";
  const loc   = job.location?.en || "nearby";
  if (skillScore >= 35)      parts.push(`Your ${skills} skills are a great match for this ${title} role.`);
  else if (skillScore >= 20) parts.push(`Your skills are closely related to what this ${title} position needs.`);
  else                       parts.push(`This ${title} role is open to workers with general skills like yours.`);
  if (locationScore >= 28)   parts.push(`The job is in ${loc} — same area as you, so no long travel needed.`);
  else if (locationScore >= 20) parts.push(`The job is in ${loc}, which is close to your location.`);
  if (job.isUrgent)          parts.push(`This employer needs someone urgently — great chance to get hired fast.`);
  if (job.salary >= 1500)    parts.push(`The salary of ₹${job.salary} is above average for this type of work.`);
  else if (job.salary >= 800) parts.push(`The pay of ₹${job.salary} is fair for this type of work.`);
  if (job.paymentMethod === "Cash") parts.push(`Payment is in cash — you get paid the same day.`);
  return parts.slice(0, 3).join(" ");
}

function buildTip(skills, job) {
  const title = (job.jobTitle?.en || "").toLowerCase();
  if (title.includes("cook") || title.includes("chef")) return "Mention any specific dishes or cuisines you know. Employers prefer cooks who are flexible with different recipes.";
  if (title.includes("driver"))   return "Mention your driving license type and years of experience. A clean record is a big plus.";
  if (title.includes("electric")) return "Tell the employer if you have domestic or commercial wiring experience. Bring your basic tools on the first day.";
  if (title.includes("plumb"))    return "Mention experience with bathroom fitting, pipeline repair, or motor installation to stand out.";
  if (title.includes("clean") || title.includes("maid")) return "Reliability and punctuality matter most. Mention if you have experience with households or offices.";
  if (title.includes("security") || title.includes("guard")) return "Mention your physical fitness and any previous security experience. Night shift availability is a bonus.";
  if (job.isUrgent) return "This is urgent — contact the employer immediately and say you are available to start today.";
  return `Call right away and say: "I have experience in ${skills} and I am available to start immediately."`;
}

function buildSummary(skills, location, count) {
  if (count === 0) return `No active jobs match your ${skills} skills in ${location} right now. Check back soon — new jobs are added daily.`;
  const urgentNote = count > 2 ? " Some are urgent, so act fast!" : "";
  return `Found ${count} job${count > 1 ? "s" : ""} matching your ${skills} skills in ${location}.${urgentNote} Click 'View Job & Apply' on the best match.`;
}

// POST /api/ai/suggestions
router.post("/suggestions", async (req, res) => {
  try {
    const { skills, location } = req.body;
    if (!skills || !location) return res.status(400).json({ error: "Skills and location are required" });

    const allJobs = await Job.find({ status: "active" }).sort({ createdAt: -1 }).limit(50).lean();

    if (allJobs.length === 0) {
      return res.json({ suggestions: [], summary: `No jobs posted yet. Check back soon!` });
    }

    const scored = allJobs.map(job => {
      const skillScore    = scoreSkill(skills, (job.skills?.en || "") + " " + (job.jobTitle?.en || ""));
      const locationScore = scoreLocation(location, job.location?.en || "");
      const bonusScore    = scoreBonus(job);
      return { job, skillScore, locationScore, total: skillScore + locationScore + bonusScore };
    });

    scored.sort((a, b) => b.total - a.total);
    // Only show jobs where skill actually matched (skillScore must be > 0)
    // This prevents Driver/Mechanic showing up for a Cook search
    const matched = scored.filter(s => s.skillScore > 0);

    // If no skill matches found, fall back to location-based jobs
    const pool = matched.length > 0 ? matched : scored.filter(s => s.locationScore >= 22);

    const top5 = pool.slice(0, 5);

    const suggestions = top5.map(({ job, skillScore, locationScore, total }) => ({
      jobId:         String(job._id),
      title:         job.jobTitle?.en || "Job Opening",
      location:      (() => {
        const loc = job.location?.en || "";
        if (!loc) return "Location not specified";
        // Extract short city name - take the part before first comma if long
        const parts = loc.split(",").map(p => p.trim()).filter(p => p.length > 0);
        // Find the shortest meaningful part (usually city name)
        if (parts.length >= 3) {
          // Long address - find the city part (usually 2nd or 3rd from end)
          const cityPart = parts.find(p => p.length > 2 && p.length < 25 && !/^\d/.test(p));
          return cityPart || parts[0];
        }
        return parts[0] || loc;
      })(),
      salary:        job.salary ? `₹${job.salary}` : "Negotiable",
      paymentMethod: job.paymentMethod || "",
      isUrgent:      job.isUrgent || false,
      matchScore:    Math.max(1, Math.min(10, Math.round((total / 103) * 10))),
      reason:        buildReason(skills, location, job, skillScore, locationScore),
      tip:           buildTip(skills, job),
    }));

    res.json({ suggestions, summary: buildSummary(skills, location, suggestions.length) });
  } catch (err) {
    console.error("AI suggestions error:", err);
    res.status(500).json({ error: "Could not generate suggestions. Please try again." });
  }
});

// POST /api/ai/career-tips
router.post("/career-tips", async (req, res) => {
  try {
    const { skill } = req.body;
    const s = (skill || "").toLowerCase();
    const tipMap = {
      electrician: ["Always carry your basic tools — screwdriver, tester, pliers.", "Get familiar with both domestic and commercial wiring to get more jobs.", "A small visiting card with your phone number helps employers remember you."],
      cook:        ["Know at least 3–4 cuisine styles to get more kitchen jobs.", "Hygiene matters as much as cooking skills — always maintain them.", "Mention if you can cook for large groups — bulk catering pays better."],
      driver:      ["Keep your driving license and RC book documents ready always.", "Being punctual and polite earns you repeat work and referrals.", "Learning GPS navigation apps like Google Maps increases your value."],
      plumber:     ["Practice bathroom fitting and pipeline repair as they are most in-demand.", "Keep basic tools like a pipe wrench and sealant tape with you.", "Availability on weekends and emergencies can double your income."],
      cleaner:     ["Bring your own cleaning supplies if possible — employers appreciate this.", "Offer both dry and wet cleaning to handle more types of jobs.", "Consistency and honesty are the #1 things employers look for."],
      security:    ["Physical fitness and alertness are the top requirements.", "Night shift availability earns you 20–30% more pay in most places.", "Having a basic first aid certificate makes you stand out."],
      carpenter:   ["Furniture repair and polishing work is available daily — learn both.", "Knowing how to read measurements precisely impresses employers.", "Carry photos of your past work on your phone to show employers."],
    };
    const tips = tipMap[s] || [
      `Be available on short notice — many ${skill} jobs are urgent.`,
      "Keep your phone charged and always answer unknown numbers.",
      "Ask satisfied employers for a reference to build your reputation.",
    ];
    res.json({ tips });
  } catch (err) {
    res.status(500).json({ error: "Could not load tips" });
  }
});

export default router;


