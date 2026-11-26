/**
 * LLM Provider and Intelligent Agent Engine for HireMate JARVIS.
 * Supports external Gemini API / OpenAI API with a resilient, built-in
 * multilingual Heuristic Intent & Tool Calling engine.
 * Ensures 100% uninterrupted operation even without third-party API keys.
 */

import { env } from "../config/env.js";
import { executeTool } from "./toolRegistry.js";
import { ASSISTANT_TOOLS } from "../constants/assistantTools.js";
import { ROLES } from "../constants/roles.js";
import { handleIndicConversationalQuery, INDIC_SYSTEM_PROMPT } from "./indicConversationalEngine.js";

// Common category/trade keywords across English, Hindi, and Marathi
const TRADE_PATTERNS = [
  { match: /(paint|color|रंगाई|रंगकाम|पेंटर|रंगारी)/i, category: "Painter" },
  { match: /(mason|brick|mistri|राजमिस्त्री|गवंडी|बांधकाम)/i, category: "Mason" },
  { match: /(carpent|wood|बढ़ई|सुतार|फर्निचर)/i, category: "Carpenter" },
  { match: /(plumb|pipe|नल|प्लंबर|नळ)/i, category: "Plumber" },
  { match: /(electri|wiring|बिजली|इलेक्ट्रीशियन|वायरिंग)/i, category: "Electrician" },
  { match: /(clean|sweep|झाड़ू|सफाई|स्वच्छता)/i, category: "Cleaner" },
  { match: /(weld|वेल्डर|वेल्डिंग)/i, category: "Welder" },
  { match: /(help|labor|मजदूर|मजूर|हमाल|हेल्पर)/i, category: "Helper" },
];

/**
 * Detect language of query (en, hi, mr)
 */
function detectLanguage(text) {
  // Marathi distinctive words (Devanagari and Romanized colloquial markers from IndicVoices)
  if (/आहे|नाही|कसे|दाखवा|करा|काम|सकाळ|दुपार|माझे|हवे|पाहिजे|गवंडी|सुतार|\b(ahe|aahe|kasa|kase|bhetel|milel|dada|bhau|kahi|kuthe|rojandari|chalel|nakki|majha|majhi)\b/i.test(text)) {
    return "mr";
  }
  // Hindi distinctive words (Devanagari and Romanized colloquial markers from IndicVoices)
  if (/है|नहीं|कैसे|दिखाओ|करो|मुझे|चाहिए|मौसम|नमस्ते|काम|\b(hai|nahi|kaise|dikhao|karo|chahiye|majoori|dihadi|thekedaar|bhaiya|kushal|shukriya)\b/i.test(text)) {
    return "hi";
  }
  return "en";
}

/**
 * Intelligent Heuristic Intent Recognizer & Tool Dispatcher
 */
export async function processWithIntelligentAgent({ message, context = {}, auth, userDoc }) {
  const role = auth?.role || "worker";
  const rawText = message.trim();
  // Strip trailing and surrounding punctuation (. ? ! , ' " etc.) that Web Speech API or typing adds
  const cleanText = rawText.replace(/^[.,!?;:'"“”\s]+|[.,!?;:'"“”\s]+$/g, "").trim();
  const lower = cleanText.toLowerCase();
  const text = cleanText || rawText;
  const lang = detectLanguage(text);

  let toolName = null;
  let toolParams = {};
  let isConfirmedExecution = false;

  // 0. Conversational Multi-Turn Context Resolution
  const pendingContext = context.pendingContext || {};

  // Check if message is a cancellation or an explicit different intent that should escape awaitingField
  const isEscapeIntent =
    /^(cancel|stop|rehne do|chhod do|nahi|no|exit|back|रद्द|थांब|नाही)$/i.test(lower) ||
    /(my applications|applied jobs|application status|आवेदन|माझे अर्ज|accept hui kya)/i.test(lower) ||
    /^(find|search|show|get|look for).*(job|kaam|kam|work|naukri)/i.test(lower) ||
    /^(weather|forecast|rain|air quality|aqi|temperature|मौसम|हवामान)/i.test(lower) ||
    /^(briefing|summary|overview|updates|morning update|ब्रीफिंग)/i.test(lower);

  // 0A. User is answering a pending profile update question (e.g. asked to change skill, now answering "Electrician")
  if (role === ROLES.WORKER && pendingContext.awaitingField && !isEscapeIntent) {
    const field = pendingContext.awaitingField;
    let newValue = null;

    if (field === "experienceYears") {
      const numMatch = lower.match(/\d+/) || lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|paanch)\b/i);
      const wordMap = { one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, five: 5, paanch: 5 };
      if (numMatch) {
        newValue = Number(numMatch[0]) || wordMap[numMatch[0].toLowerCase()] || 2;
        toolName = "update_profile";
        toolParams = { field, newValue };
      } else {
        return {
          reply: lang === "hi"
            ? "कृपया बताएं कि आपके पास कितने साल का अनुभव है? (जैसे: 2 साल या 3 साल)।"
            : "Please tell me the number of years of experience you have, for example: '2 years' or '3 years'.",
          nextPendingContext: { awaitingField: "experienceYears", awaitingAction: "update_profile" },
          suggestedQueries: ["1 year", "2 years", "3 years", "5 years"],
        };
      }
    } else if (field === "skills") {
      for (const t of TRADE_PATTERNS) {
        if (t.match.test(lower)) {
          newValue = t.category;
          break;
        }
      }
      // If no standard trade pattern matched, check if it's a valid 1-3 word skill
      if (!newValue && text.length >= 3 && text.length <= 30 && !/(application|status|weather|briefing|job)/i.test(lower)) {
        newValue = text.replace(/[.,!?;:]/g, "").trim();
      }

      if (newValue) {
        toolName = "update_profile";
        toolParams = { field, newValue };
      } else {
        return {
          reply: lang === "hi"
            ? "कृपया बताएं कि आप कौन सा हुनर जोड़ना चाहते हैं? (जैसे: इलेक्ट्रीशियन, पेंटर, प्लंबर, कारपेंटर, या राजमिस्त्री)।"
            : "Please tell me which skill or trade you would like to set (e.g. Electrician, Painter, Plumber, Mason, Carpenter).",
          nextPendingContext: { awaitingField: "skills", awaitingAction: "update_profile" },
          suggestedQueries: ["Electrician", "Painter", "Plumber", "Mason", "Carpenter"],
        };
      }
    } else if (field === "name") {
      const cleanedName = text.replace(/^(my name is|make it|set to|mera naam|naam)?\s*/i, "").replace(/[.,!?;:]/g, "").trim();
      if (cleanedName.length >= 2) {
        toolName = "update_profile";
        toolParams = { field, newValue: cleanedName };
      } else {
        return {
          reply: lang === "hi"
            ? "कृपया अपना पूरा नाम बताएं जो आप प्रोफ़ाइल में रखना चाहते हैं।"
            : "Please tell me the full name you would like to set in your profile.",
          nextPendingContext: { awaitingField: "name", awaitingAction: "update_profile" },
        };
      }
    } else if (field === "location") {
      const cleanedLoc = text.replace(/^(location|city|in|to|set to|mera shahar)?\s*/i, "").replace(/[.,!?;:]/g, "").trim();
      if (cleanedLoc.length >= 3) {
        toolName = "update_profile";
        toolParams = { field, newValue: cleanedLoc };
      } else {
        return {
          reply: "Which city or location would you like to set in your profile? (e.g. Nashik, Pune, Mumbai).",
          nextPendingContext: { awaitingField: "location", awaitingAction: "update_profile" },
          suggestedQueries: ["Nashik", "Pune", "Mumbai"],
        };
      }
    }
  }

  // 0B. Conversational Affirmation & Confirmation ("yes", "haan", "sure", "confirm", "proceed", "check karo")
  else if (/^(yes|yeah|yep|haan|ha|sure|ok|okay|kar do|dikhao|dekho|check karo|bilkul|yes please|ha dikhao|haan dikhao|confirm|proceed)$/i.test(lower)) {
    if (pendingContext.awaitingConfirmation) {
      const pending = pendingContext.awaitingConfirmation;
      toolName = pending.action;
      toolParams = pending.details?.payload || pending.details || {};
      isConfirmedExecution = true;
    } else {
      // Affirmative greeting or prompt follow-up
      const recent = context.recentHistory || [];
      const lastAssistant = [...recent].reverse().find((m) => m.role === "assistant");
      const lastContent = (lastAssistant?.content || "").toLowerCase();

      if (role === ROLES.WORKER) {
        if (lastContent.includes("application") || lastContent.includes("status")) {
          toolName = "get_my_applications";
        } else {
          // Default affirmative follow-up ("Would you like me to check today's job opportunities? -> yes")
          toolName = "search_jobs";
        }
      } else if (role === ROLES.EMPLOYER) {
        if (lastContent.includes("application") || lastContent.includes("candidate")) {
          toolName = "get_job_applicants";
        } else {
          toolName = "get_my_jobs";
        }
      }
    }
  }

  // 0C. User is answering a sequential job application ("apply for the second one", "apply for the first one", "sabse paas wali")
  else if (role === ROLES.WORKER && pendingContext.lastJobs?.length && /(apply|आवेदन|पहला|दूसरा|first|second|third|1st|2nd|paas|closest)/i.test(lower)) {
    const jobs = pendingContext.lastJobs;
    let chosenJob = jobs[0];
    if (/(second|2nd|दूसरा)/i.test(lower) && jobs.length > 1) {
      chosenJob = jobs[1];
    } else if (/(third|3rd|तीसरा)/i.test(lower) && jobs.length > 2) {
      chosenJob = jobs[2];
    }
    toolName = "apply_for_job";
    toolParams = { jobId: chosenJob.id || chosenJob._id };
  }

  // 1. Weather and Air Quality
  else if (/weather|forecast|rain|air quality|aqi|temperature|मौसम|बारिश|हवामान|पाऊस/i.test(lower)) {
    toolName = "get_weather_and_air_quality";
    toolParams = {
      latitude: context.latitude,
      longitude: context.longitude,
      cityName: context.city,
    };
  }

  // 2. Daily Briefing
  else if (/briefing|summary|overview|updates|morning update|आज का अपडेट|ब्रीफिंग|आजचा सारांश/i.test(lower)) {
    toolName = "get_daily_briefing";
    toolParams = {
      latitude: context.latitude,
      longitude: context.longitude,
    };
  }

  // 2B. Direct Autonomous Navigation across HireMate Pages
  else if (/(take me to|navigate to|open|go to|chalo|kholo|dikhao|show)\s+(my\s+)?(application|applications|jobs?|dashboard|profile|post\s*job|offers?|notifications?|history)/i.test(lower) ||
           /(applications|dashboard|profile|post\s*job|job\s*offers|work\s*history)\s+(kholo|dikhao|page|chalo)/i.test(lower)) {
    if (/(application|applications|अर्ज|आवेदन)/i.test(lower)) {
      if (role === ROLES.WORKER) {
        toolName = "get_my_applications";
      } else {
        toolName = "get_job_applicants";
      }
    } else if (/(post\s*job|job\s*post|नया काम|नवीन काम)/i.test(lower) && role === ROLES.EMPLOYER) {
      return {
        reply: lang === "hi"
          ? "बिल्कुल! मैं आपके लिए नया जॉब पोस्ट पेज खोल रहा हूँ।"
          : lang === "mr"
          ? "नक्कीच! मी आपल्यासाठी नवीन नोकरी पोस्ट करण्याचे पान उघडत आहे."
          : "Opening the job post page for you now. Tell me the role, vacancies, wage, and location, or fill the form directly.",
        action: { type: "navigate", route: "/post-job" },
      };
    } else if (/(job|jobs|kaam|काम|नोकऱ्या)/i.test(lower) && !/(post|my\s*jobs)/i.test(lower)) {
      toolName = "search_jobs";
    } else if (/(profile|प्रोफाइल)/i.test(lower)) {
      toolName = "get_my_profile";
    } else if (/(offer|offers|ऑफर)/i.test(lower) && role === ROLES.WORKER) {
      return {
        reply: "Opening your received job offers.",
        action: { type: "navigate", route: "/job-offers" },
      };
    } else if (/(notification|notifications|सूचना)/i.test(lower)) {
      const targetRoute = role === ROLES.WORKER ? "/worker-notifications" : "/employer-notifications";
      return {
        reply: "Opening your notifications page.",
        action: { type: "navigate", route: targetRoute },
      };
    } else if (/(history|completed|इतिहास)/i.test(lower)) {
      const targetRoute = role === ROLES.WORKER ? "/work-history" : "/employer-completed-work";
      return {
        reply: "Opening your work history.",
        action: { type: "navigate", route: targetRoute },
      };
    } else if (/(dashboard|डैशबोर्ड)/i.test(lower)) {
      const targetRoute = role === ROLES.WORKER ? "/worker-dashboard" : "/employer-dashboard";
      return {
        reply: "Taking you back to your main dashboard.",
        action: { type: "navigate", route: targetRoute },
      };
    }
  }

  // 3. Navigation / Route to Job Site
  else if (/navigate|navigation|route|directions|map|location of site|रास्ता|नेविगेशन|पत्ता/i.test(lower) && role === ROLES.WORKER) {
    toolName = "navigate_to_job";
    toolParams = {
      applicationId: context.activeApplicationId || context.applicationId,
    };
  }

  // 4. Job Search (Workers)
  else if (
    role === ROLES.WORKER &&
    (/(find|search|show|get|look for|chahiye|hawa|हवे).*(job|kaam|kam|work|naukri)/i.test(lower) ||
      /(job|kaam|kam|work|naukri).*(chahiye|dikh|batao|milega|aata hai|find|search)/i.test(lower) ||
      /(electrician|wireman|painter|mason|carpenter|plumber|cleaner).*(kaam|job|chahiye|work)/i.test(lower) ||
      /काम|नौकरी|रोजगार|काम दाखवा/i.test(lower))
  ) {
    toolName = "search_jobs";
    // Check if category mentioned
    for (const t of TRADE_PATTERNS) {
      if (t.match.test(lower)) {
        toolParams.category = t.category;
        break;
      }
    }
    // Check for wage
    const wageMatch = lower.match(/(?:above|min|₹|rs\.?|रुपये)\s*(\d{3,5})/i) || lower.match(/(\d{3,5})\s*(?:₹|rs\.?|रुपये)/i);
    if (wageMatch) {
      toolParams.minWage = Number(wageMatch[1]);
    }
  }

  // 5. My Applications (Workers)
  else if (/(my applications|applied jobs|application status|आवेदन|माझे अर्ज|status|accept hui kya|select kiya hai)/i.test(lower) && role === ROLES.WORKER) {
    toolName = "get_my_applications";
  }

  // 6. Worker: Update Profile Intent
  else if (
    role === ROLES.WORKER &&
    (/(update|change|edit|modify|badlo|badalna|set|make|kardo|kar do|rakho|rakh do|put).*(profile|skill|skills|trade|experience|location|city|name|naam)/i.test(lower) ||
      /(profile|skill|skills|trade|experience|location|city|name|naam).*(update|change|edit|modify|badlo|badal do|kar do|set|make|kardo)/i.test(lower) ||
      /(experience|तजुर्बा|अनुभव).*\b(\d+)\b/i.test(lower) ||
      /\b(\d+)\b.*(saal|year|years|साल).*(experience|तजुर्बा|अनुभव)/i.test(lower) ||
      /(want to change|meri profile|profile me|mera experience|my experience)/i.test(lower) ||
      /^(experience|skills?|trade|location|naam|name)$/i.test(lower))
  ) {
    // Check for specific trade/skill mentioned directly
    let tradeMatch = null;
    for (const t of TRADE_PATTERNS) {
      if (t.match.test(lower)) {
        tradeMatch = t.category;
        break;
      }
    }

    const expNumMatch = lower.match(/(?:experience|तजुर्बा|अनुभव).*?(\d+)/i) || 
                        lower.match(/(\d+)\s*(?:saal|year|years|साल).*?(?:experience|तजुर्बा|अनुभव)/i) ||
                        lower.match(/(?:make|set|update|change|put)?\s*(?:my\s*)?(?:experience|तजुर्बा|अनुभव)\s*(?:is|to|as)?\s*(\d+)/i) ||
                        lower.match(/\b(\d+)\s*(?:saal|year|years|साल)/i);

    const locMatch = lower.match(/(?:location|city|जगह|शहर).*?(?:to|in|में|येथे)?\s*([a-zA-Z\s]{3,20})(?:\s*kar do|\s*kardo|$)/i);
    
    // Direct name extraction: "change name Rudra", "update name to Rahul Sharma", "mera naam Rudra kar do"
    const nameDirectMatch =
      lower.match(/(?:change|update|make|set|badlo|badal do|rakho|rakh do)?\s*(?:my\s*)?(?:name|naam|नाम)\s*(?:to|is|as|=|में|येथे)?\s+([a-zA-Z\s]{2,25})(?:\s*kar do|\s*kardo|$)/i) ||
      lower.match(/(?:make|set|change|update)\s+(?:my\s+)?(?:name|naam|नाम)\s+(?:to\s+|as\s+)?([a-zA-Z\s]{2,25})/i);
    const hasSpecificName =
      nameDirectMatch &&
      !/^(the|my|mera|meri|to|is|as|update|change|profile|experience|skill|skills|job|location)$/i.test(nameDirectMatch[1].trim()) &&
      !/(experience|skill|skills|rupaye|job|profile|kardo|kar do|change|update)/i.test(nameDirectMatch[1].trim());

    // Title case helper for proper display of names
    const toTitleCase = (str) => str.replace(/\b\w/g, (char) => char.toUpperCase());
    const directNameValue = hasSpecificName ? toTitleCase(nameDirectMatch[1].trim()) : null;

    if (tradeMatch && /(skill|skills|trade|kaam|काम|हुनर)/i.test(lower)) {
      toolName = "update_profile";
      toolParams = { field: "skills", newValue: tradeMatch };
    } else if (expNumMatch) {
      toolName = "update_profile";
      toolParams = { field: "experienceYears", newValue: Number(expNumMatch[1]) };
    } else if (hasSpecificName) {
      toolName = "update_profile";
      toolParams = { field: "name", newValue: directNameValue };
    } else if (locMatch && !/(rupaye|rs|chahiye|experience|skill|name)/i.test(locMatch[1])) {
      toolName = "update_profile";
      toolParams = { field: "location", newValue: locMatch[1].trim() };
    } else if (/(name|naam|नाम)/i.test(lower)) {
      // Specifically asked: "change the name", "update name", "change my name", "naam badlo"
      return {
        reply: lang === "hi"
          ? "ज़रूर! आप अपनी प्रोफ़ाइल में क्या पूरा नाम रखना चाहते हैं?"
          : lang === "mr"
          ? "नक्कीच! आपण आपल्या प्रोफाइलमध्ये कोणते पूर्ण नाव ठेवू इच्छिता?"
          : "Sure! What full name would you like to set in your profile?",
        nextPendingContext: { awaitingField: "name", awaitingAction: "update_profile" },
      };
    } else if (/(experience|अनुभव|तजुर्बा)/i.test(lower)) {
      // Specifically asked: "change experience", "update experience", or "experience"
      return {
        reply: lang === "hi"
          ? "ज़रूर! आपके पास कितने साल का अनुभव है? (जैसे: 2 साल, 3 साल, या 5 साल)।"
          : lang === "mr"
          ? "नक्कीच! आपल्याकडे किती वर्षांचा अनुभव आहे? (उदा: २ वर्षे, ३ वर्षे, ५ वर्षे)."
          : "Sure! How many years of experience do you have? (e.g. 2 years, 3 years, or 5 years).",
        nextPendingContext: { awaitingField: "experienceYears", awaitingAction: "update_profile" },
        suggestedQueries: ["1 year", "2 years", "3 years", "5 years"],
      };
    } else if (/(skill|skills|trade|हुनर)/i.test(lower)) {
      // Specifically asked: "i want to change the skill in profile"
      return {
        reply: lang === "hi"
          ? "ज़रूर! आप अपनी प्रोफ़ाइल में कौन सा हुनर या ट्रेड जोड़ना चाहते हैं? (जैसे: इलेक्ट्रीशियन, पेंटर, प्लंबर, कारपेंटर, या राजमिस्त्री)।"
          : lang === "mr"
          ? "नक्कीच! आपण आपल्या प्रोफाइलमध्ये कोणते कौशल्य ठेवू इच्छिता? (उदा: इलेक्ट्रिशियन, पेंटर, प्लंबर, सुतार, गवंडी)."
          : "Sure! What trade or skill would you like to set in your profile? (e.g. Electrician, Painter, Plumber, Mason, Carpenter).",
        nextPendingContext: { awaitingField: "skills", awaitingAction: "update_profile" },
        suggestedQueries: ["Electrician", "Painter", "Plumber", "Mason", "Carpenter"],
      };
    } else if (/(location|city|शहर|जगह)/i.test(lower)) {
      return {
        reply: lang === "hi"
          ? "ज़रूर! आप अपनी प्रोफ़ाइल में कौन सा शहर या इलाका सेट करना चाहते हैं? (जैसे: नासिक, पुणे, या मुंबई)।"
          : "Sure! Which city or preferred location would you like to set in your profile? (e.g. Nashik, Pune, Mumbai).",
        nextPendingContext: { awaitingField: "location", awaitingAction: "update_profile" },
        suggestedQueries: ["Nashik", "Pune", "Mumbai"],
      };
    } else {
      // General question: "Jarvis, mujhe meri profile update karni hai"
      return {
        reply: lang === "hi"
          ? "बिल्कुल! आप अपनी प्रोफ़ाइल में क्या बदलना चाहते हैं? (जैसे: अनुभव, हुनर, शहर या नाम)। आप कह सकते हैं: 'मेरा एक्सपीरियंस 3 साल कर दो' या 'मेरा स्किल इलेक्ट्रीशियन कर दो'।"
          : lang === "mr"
          ? "नक्कीच! आपण आपल्या प्रोफाइलमध्ये काय बदलू इच्छिता? (उदा: अनुभव, कौशल्ये, पत्ता किंवा नाव)."
          : "Certainly! What would you like to update in your profile? (e.g. Experience, Skills, Location, or Name). You can say 'Update my experience to 3 years' or 'Change my skill to Electrician'.",
        suggestedQueries: ["Mera experience 3 saal kar do", "Change skill to Electrician", "Meri location Pune kar do"],
      };
    }
  }

  // 7. User Profile View
  else if (/(my profile|view profile|profile details|मेरी प्रोफाइल|माझी प्रोफाइल)/i.test(lower)) {
    toolName = "get_my_profile";
  }

  // 8. Employer: Candidate Comparison ("In dono workers me se kaun better hai?")
  else if (role === ROLES.EMPLOYER && (/(kaun better hai|who is better|compare|comparison|kisko hire karu|which candidate|उमेदवारांची तुलना)/i.test(lower) || (lower.includes("better") && lower.includes("worker")))) {
    toolName = "compare_candidates";
    toolParams = {};
    // Extract candidate names if mentioned (e.g., "Raghav aur Suresh")
    const names = [];
    const words = text.split(/[\s,]+/);
    for (const w of words) {
      if (/^[A-Z][a-z]{2,}$/.test(w) && !["Jarvis", "HireMate", "Show", "Who", "Better"].includes(w)) {
        names.push(w);
      }
    }
    if (names.length >= 2) {
      toolParams.workerNames = names;
    }
  }

  // 9. Employer: Candidate Acceptance / Rejection ("Raghav ko accept kar do")
  else if (role === ROLES.EMPLOYER && /(accept|hire|select|reject|decline|चयन|स्वीकार|नाकार)/i.test(lower) && /(worker|candidate|ko|application|kardo|kar do)/i.test(lower)) {
    toolName = "decide_application";
    const isAccept = /(accept|hire|select|स्वीकार|चयन)/i.test(lower);
    const decision = isAccept ? "accepted" : "declined";

    // Extract worker name
    const nameMatch = text.match(/([A-Z][a-z]+)\s*(?:ko|for|as|\s*to)/) || text.match(/(?:accept|hire|reject)\s+([A-Z][a-z]+)/i);
    const workerName = nameMatch ? nameMatch[1] : undefined;

    toolParams = {
      decision,
      workerName,
      applicationId: context.activeApplicationId,
    };
  }

  // 10. Employer: View My Job Posts
  else if (/(my jobs|my postings|active jobs|posted jobs|माझ्या नोकऱ्या|पोस्ट केलेल्या नोकऱ्या)/i.test(lower) && role === ROLES.EMPLOYER) {
    toolName = "get_my_jobs";
  }

  // 11. Employer: View Applicants
  else if (/(candidates|applicants|who applied|applications|उमेदवार|अर्जदार)/i.test(lower) && role === ROLES.EMPLOYER) {
    toolName = "get_job_applicants";
  }

  // 12. Employer: Post / Create a Job
  else if (
    role === ROLES.EMPLOYER &&
    (/(post|create|hire|need|require|need workers|worker chahiye|कामगार हवेत).*(job|worker|painter|mason|carpenter|plumber|electrician|helper)/i.test(lower) ||
      /(painter|mason|carpenter|plumber|electrician|cleaner|worker|मजूर|कामगार).*(chahiye|need|require|हवेत|ki jarurat|post|hire)/i.test(lower) ||
      /(post\s*job|job\s*post|नया काम|नवीन काम)/i.test(lower))
  ) {
    // If user just said "help me post a job" or "post a job" without mentioning a specific trade:
    const isGenericPostJob =
      /^(help\s*me\s*)?(post|create)\s*(a\s*)?job$/i.test(lower) ||
      /^(post\s*job|job\s*post|नया काम|नवीन काम)$/i.test(lower) ||
      lower === "help me post a job";

    if (isGenericPostJob) {
      return {
        reply: lang === "hi"
          ? "बिल्कुल! मैं नया जॉब पोस्ट करने में आपकी मदद करूँगा। आपको किस काम के लिए कारीगर चाहिए? (जैसे: पेंटर, राजमिस्त्री, कारपेंटर, इलेक्ट्रीशियन, या हेल्पर)।"
          : lang === "mr"
          ? "नक्कीच! नवीन नोकरी पोस्ट करण्यासाठी आपल्याला कोणत्या कामासाठी कामगार हवे आहेत? (उदा: गवंडी, सुतार, पेंटर, किंवा मदतनीस)."
          : "I would be happy to help you post a job! What worker category do you need? (e.g. Painter, Mason, Carpenter, Electrician, Plumber, or Helper).",
        action: { type: "navigate", route: "/post-job" },
        suggestedQueries: ["Post painter job", "Need 2 masons in Nashik", "Electrician needed at 900"],
      };
    }

    toolName = "create_job_post";
    // Extract category
    let category = "General";
    for (const t of TRADE_PATTERNS) {
      // Exclude "help" if it was just "help me"
      if (t.category === "Helper" && /help\s+me/i.test(lower) && !/(helper|labor|मजदूर|मजूर|हमाल|हेल्पर)/i.test(lower)) {
        continue;
      }
      if (t.match.test(lower)) {
        category = t.category;
        break;
      }
    }
    // Extract vacancies count
    const countMatch = lower.match(/(\d+)\s*(worker|workers|people|मजूर|कामगार|लोग|painter|painters|mason|masons|electrician|electricians|plumber|plumbers|carpenter|carpenters)/i);
    const vacancies = countMatch ? Number(countMatch[1]) : 1;

    // Extract wage
    const wageMatch = lower.match(/(?:₹|rs\.?|inr|रुपये)\s*(\d{3,5})/i) || lower.match(/(\d{3,5})\s*(?:₹|rs\.?|रुपये|rupaye)/i);
    const dailyWage = wageMatch ? Number(wageMatch[1]) : 800;

    // Extract location safely (never match "help me", "tell me" as location)
    let location = userDoc?.location || "Nashik";
    const postPostpositionMatch = lower.match(/([a-zA-Z\s]{3,20})\s+(?:mein|me|में|येथे)/i);
    const prepositionMatch = lower.match(/(?:in|at|near|location)\s+([a-zA-Z\s]{3,20})/i);
    if (
      postPostpositionMatch &&
      !/^(help|tell|show|give|for|call|ask|alert|remind|notify|guide)\b/i.test(postPostpositionMatch[1].trim()) &&
      !/(rupaye|rs|chahiye|daily|wage)/i.test(postPostpositionMatch[1])
    ) {
      location = postPostpositionMatch[1].trim();
    } else if (prepositionMatch && !/(rupaye|rs|chahiye|daily|wage)/i.test(prepositionMatch[1])) {
      location = prepositionMatch[1].trim();
    }

    toolParams = {
      jobTitle: `${category} required`,
      category,
      dailyWage,
      vacancies,
      location,
      shift: "Standard Day Shift (9 AM - 6 PM)",
    };
  }

  // 10. Platform Help & FAQs
  else if (/(how (to|does|do)|help|rules|contact|support|payment|faq|safety|मदद|कसे काम करते)/i.test(lower)) {
    toolName = "get_platform_help";
    toolParams = { topic: lower };
  }

  // Execute recognized tool if any
  if (toolName) {
    try {
      const toolResult = await executeTool(toolName, toolParams, auth, { isConfirmed: isConfirmedExecution });

      // If tool requires confirmation, return prompt + confirmation card
      if (toolResult.requiresConfirmation) {
        const actionData = { ...toolResult };
        if (toolName === "create_job_post") {
          actionData.route = "/post-job";
          actionData.prefill = {
            trade: toolParams.category,
            category: toolParams.category,
            vacancies: toolParams.vacancies,
            dailyWage: toolParams.dailyWage,
            location: toolParams.location,
            title: toolParams.jobTitle,
          };
        }
        return {
          reply: `I have prepared this action for you: ${toolResult.summary}. Please confirm below to proceed.`,
          action: actionData,
          executedTool: toolName,
        };
      }

      // Generate conversational answer based on tool result
      let reply = "";
      if (toolName === "search_jobs") {
        if (toolResult.count > 0) {
          reply = lang === "hi"
            ? `मुझे आपके लिए ${toolResult.count} सक्रिय काम मिले हैं। आप नीचे विवरण देख सकते हैं या आवेदन करने के लिए कह सकते हैं।`
            : lang === "mr"
            ? `मला आपल्यासाठी ${toolResult.count} सक्रिय कामे सापडली आहेत. आपण खालील तपशील पाहू शकता.`
            : `I found ${toolResult.count} active job opportunities matching your criteria. Here are the top matches:`;
        } else {
          reply = lang === "hi"
            ? "फिलहाल इस श्रेणी में कोई सक्रिय काम उपलब्ध नहीं है। क्या आप किसी अन्य ट्रेड में देखना चाहेंगे?"
            : "No active jobs found matching that exact filter right now. Would you like to check nearby categories?";
        }
      } else if (toolName === "get_weather_and_air_quality") {
        reply = lang === "hi"
          ? `वर्तमान में तापमान ${toolResult.temperature}°C है और मौसम ${toolResult.weatherDesc} है। ${toolResult.safetyAdvice}`
          : lang === "mr"
          ? `सध्या तापमान ${toolResult.temperature}°C असून हवामान ${toolResult.weatherDesc} आहे. ${toolResult.safetyAdvice}`
          : `It's currently ${toolResult.temperature}°C and ${toolResult.weatherDesc} in ${toolResult.city}. AQI is ${toolResult.aqi} (${toolResult.aqiLabel}). ${toolResult.safetyAdvice}`;
      } else if (toolName === "get_daily_briefing") {
        reply = toolResult.voiceBriefing;
      } else if (toolName === "get_my_applications") {
        reply = `You have ${toolResult.count} active application(s). You can review their progress in your dashboard.`;
      } else if (toolName === "get_my_jobs") {
        reply = `You currently have ${toolResult.count} job post(s) listed.`;
      } else if (toolName === "get_job_applicants") {
        reply = `You have ${toolResult.count} candidate application(s) across your postings.`;
      } else if (toolName === "get_my_profile") {
        reply = `Here is your profile information, ${toolResult.profile?.name}.`;
      } else if (toolName === "navigate_to_job") {
        reply = `Navigation route ready for ${toolResult.destination?.title}. Starting directions.`;
      } else if (toolName === "compare_candidates") {
        reply = toolResult.opinion || toolResult.message;
      } else if (toolName === "update_profile") {
        reply = toolResult.message;
      } else if (toolName === "get_platform_help") {
        reply = toolResult.guidance;
      }

      const actionPayload = {
        type: toolName,
        data: toolResult,
      };
      if (toolName === "get_my_applications") {
        actionPayload.route = "/my-applications";
      } else if (toolName === "get_my_profile") {
        actionPayload.route = role === ROLES.WORKER ? "/worker-profile" : "/employer-profile";
      } else if (toolName === "get_my_jobs") {
        actionPayload.route = "/employer-jobs";
      } else if (toolName === "get_job_applicants") {
        actionPayload.route = "/applications";
      }

      return {
        reply,
        action: actionPayload,
        executedTool: toolName,
      };
    } catch (err) {
      return {
        reply: `I encountered an issue executing that request: ${err.message}`,
        error: err.message,
      };
    }
  }

  // Conversational response handling when no tool was explicitly needed
  const userName = userDoc?.name || (role === ROLES.EMPLOYER ? "Contractor" : "Worker");

  if (/^(hi|hello|hey|namaste|नमस्ते|नमस्कार|हेलो)/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? `नमस्ते ${userName}! मैं जार्विस हूँ, आपका HireMate एआई साथी। मैं आपकी क्या मदद कर सकता हूँ?`
        : lang === "mr"
        ? `नमस्कार ${userName}! मी जार्विस आहे, आपला HireMate एआय साथीदार. मी आपल्याला कशी मदत करू?`
        : `Hello ${userName}! I am JARVIS, your HireMate personal assistant. How can I assist you right now?`,
    };
  }

  if (/how are you|kaise ho|kasa ahes|कसा आहेस|कैसे हो/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? `मैं बहुत बढ़िया हूँ, ${userName}! HireMate के सभी सिस्टम सक्रिय हैं और मैं आपके काम में मदद के लिए तैयार हूँ।`
        : lang === "mr"
        ? `मी एकदम छान आहे, ${userName}! HireMate च्या सर्व सेवा सुरू आहेत आणि मी आपल्याला मदत करण्यास सज्ज आहे.`
        : `I am doing fantastic, ${userName}! All HireMate systems are running smoothly and I am ready to assist you.`,
    };
  }

  if (/joke|chutkula|haswa|हंसो|मजाक|विनोद/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? "एक बार एक इलेक्ट्रीशियन से पूछा: 'तुम्हारी शादी कैसी चल रही है?' उसने कहा: 'बढ़िया, बस कभी-कभी शॉर्ट सर्किट हो जाता है!'"
        : "Why do electricians make great detectives? Because they're always finding loose connections and solving high-voltage cases!",
    };
  }

  if (/what is hiremate|hiremate kya hai|hiremate kay ahe|hiremate बद्दल/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? "HireMate भारत का विशेष दैनिक-वेतन कामगार और ठेकेदार मंच है, जो कामगारों को पास का काम खोजने और नियोक्ताओं को तुरंत कुशल कारीगर नियुक्त करने में मदद करता है।"
        : "HireMate is a platform designed for daily-wage workers and employers in India to easily connect, manage job requests, track work, and ensure fair, prompt daily settlements.",
    };
  }

  if (/who are you|what are you|what can you do|तुम कौन हो|तू कोण आहेस/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? "मैं HireMate JARVIS हूँ — आपका व्यक्तिगत एआई साथी। मैं आपको काम खोजने, आवेदन करने, नए जॉब पोस्ट करने, मौसम और हवा की गुणवत्ता बताने तथा साइट तक नेविगेशन में मदद कर सकता हूँ।"
        : "I am HireMate JARVIS — your personal AI companion. I can help you search jobs, submit applications, post job requirements, check weather safety, track navigation, and manage daily tasks via voice or text.",
    };
  }

  if (/thank you|thanks|धन्यवाद|शुक्रिया/i.test(lower)) {
    return {
      reply: lang === "hi"
        ? "आपका स्वागत है! यदि आपको किसी और चीज़ की आवश्यकता हो, तो बस मुझे बताएं।"
        : lang === "mr"
        ? "आपले स्वागत आहे! आणखी काही मदत हवी असल्यास नक्की सांगा."
        : "You are very welcome! Let me know whenever you need anything else.",
    };
  }

  // Indic Chat, OpenAssistant OASST1 & AI4Bharat IndicVoices Conversational Engine
  const indicChatResponse = handleIndicConversationalQuery({ text, lower, lang, userName, role });
  if (indicChatResponse) {
    return indicChatResponse;
  }

  // Fallback helpful guidance
  return {
    reply: role === ROLES.WORKER
      ? `I am here to assist you, ${userName}. You can ask me to "Show jobs near me", "What is the weather today?", "Check my applications", or "Give me my daily briefing".`
      : `I am here to assist you, ${userName}. You can say "Show my active jobs", "Help me post a job for 2 painters", "Review applicants", or "Check today's weather".`,
    suggestedQueries: role === ROLES.WORKER
      ? ["Show jobs near me", "Today's weather", "My applications", "Daily briefing"]
      : ["Show my active jobs", "Post a job", "Review applicants", "Today's weather"],
  };
}

/**
 * Main Assistant message handler.
 * Tries external Gemini/OpenAI if configured, with instant fallback to processWithIntelligentAgent.
 */
export async function generateAssistantResponse({ message, context, auth, userDoc }) {
  // If GEMINI_API_KEY is configured, we can optionally query Gemini with system prompt
  if (env.ai?.geminiApiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.ai.geminiApiKey}`;
      const systemInstruction = INDIC_SYSTEM_PROMPT.trim();

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\nUser message: ${message}` }] }],
          generationConfig: { maxOutputTokens: 250, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          // Check if any tool should also be executed
          const agentResult = await processWithIntelligentAgent({ message, context, auth, userDoc });
          return {
            reply: agentResult.action ? agentResult.reply : candidate.trim(),
            action: agentResult.action,
            executedTool: agentResult.executedTool,
          };
        }
      }
    } catch (err) {
      console.warn("External LLM fallback triggered:", err.message);
    }
  }

  // Resilient intelligent heuristic engine
  return await processWithIntelligentAgent({ message, context, auth, userDoc });
}
