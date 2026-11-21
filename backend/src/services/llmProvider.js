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
  // Marathi distinctive words or Devanagari with Marathi markers
  if (/आहे|नाही|कसे|दाखवा|करा|काम|सकाळ|दुपार|माझे|हवे|पाहिजे|गवंडी|सुतार/i.test(text)) {
    return "mr";
  }
  // Hindi distinctive words
  if (/है|नहीं|कैसे|दिखाओ|करो|मुझे|चाहिए|मौसम|नमस्ते|काम/i.test(text)) {
    return "hi";
  }
  return "en";
}

/**
 * Intelligent Heuristic Intent Recognizer & Tool Dispatcher
 */
export async function processWithIntelligentAgent({ message, context = {}, auth, userDoc }) {
  const role = auth?.role || "worker";
  const text = message.trim();
  const lower = text.toLowerCase();
  const lang = detectLanguage(text);

  let toolName = null;
  let toolParams = {};

  // 0. Conversational Multi-Turn Context Resolution
  const pendingContext = context.pendingContext || {};

  // 0A. User is answering a pending profile update question (e.g. asked to change skill, now answering "Electrician")
  if (role === ROLES.WORKER && pendingContext.awaitingField) {
    const field = pendingContext.awaitingField;
    let newValue = text;

    if (field === "experienceYears") {
      const numMatch = lower.match(/\d+/);
      newValue = numMatch ? Number(numMatch[0]) : 3;
    } else if (field === "skills") {
      for (const t of TRADE_PATTERNS) {
        if (t.match.test(lower)) {
          newValue = t.category;
          break;
        }
      }
    }
    toolName = "update_profile";
    toolParams = { field, newValue };
  }

  // 0B. User is answering a sequential job application ("apply for the second one", "apply for the first one", "sabse paas wali")
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
    (/(update|change|edit|modify|badlo|badalna|set).*(profile|skill|skills|trade|experience|location|city|name|naam)/i.test(lower) ||
      /(profile|skill|skills|trade|experience|location|city|name|naam).*(update|change|edit|modify|badlo|badal do|kar do)/i.test(lower) ||
      /(want to change|meri profile|profile me)/i.test(lower))
  ) {
    // Check for specific trade/skill mentioned directly
    let tradeMatch = null;
    for (const t of TRADE_PATTERNS) {
      if (t.match.test(lower)) {
        tradeMatch = t.category;
        break;
      }
    }

    const expMatch = lower.match(/(?:experience|तजुर्बा|अनुभव).*?(\d+)\s*(?:saal|year|years|साल)/i) || lower.match(/(\d+)\s*(?:saal|year|years|साल).*?(?:experience|तजुर्बा|अनुभव)/i);
    const locMatch = lower.match(/(?:location|city|जगह|शहर).*?(?:to|in|में|येथे)?\s*([a-zA-Z\s]{3,20})(?:\s*kar do|\s*kardo|$)/i);
    const nameMatch = lower.match(/(?:name|naam|नाम).*?(?:to|is|में|येथे)?\s*([a-zA-Z\s]{3,25})(?:\s*kar do|\s*kardo|$)/i);

    if (tradeMatch && /(skill|skills|trade|kaam|काम|हुनर)/i.test(lower)) {
      toolName = "update_profile";
      toolParams = { field: "skills", newValue: tradeMatch };
    } else if (expMatch) {
      toolName = "update_profile";
      toolParams = { field: "experienceYears", newValue: Number(expMatch[1]) };
    } else if (locMatch) {
      toolName = "update_profile";
      toolParams = { field: "location", newValue: locMatch[1].trim() };
    } else if (nameMatch) {
      toolName = "update_profile";
      toolParams = { field: "name", newValue: nameMatch[1].trim() };
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
    (/(post|create|hire|need|require|need workers|worker chahiye|कामगार हवेत).*(job|worker|painter|mason|carpenter|plumber|electrician)/i.test(lower) ||
      /(painter|mason|carpenter|plumber|electrician|cleaner|worker|मजूर|कामगार).*(chahiye|need|require|हवेत|ki jarurat|post|hire)/i.test(lower))
  ) {
    toolName = "create_job_post";
    // Extract category
    let category = "General";
    for (const t of TRADE_PATTERNS) {
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

    // Extract location
    let location = "Nashik";
    const postPostpositionMatch = lower.match(/([a-zA-Z\s]{3,20})\s+(?:mein|me|में|येथे)/i);
    const prepositionMatch = lower.match(/(?:in|at|near|location)\s+([a-zA-Z\s]{3,20})/i);
    if (postPostpositionMatch && !/(rupaye|rs|chahiye|daily|wage)/i.test(postPostpositionMatch[1])) {
      location = postPostpositionMatch[1].trim();
    } else if (prepositionMatch && !/(rupaye|rs|chahiye|daily|wage)/i.test(prepositionMatch[1])) {
      location = prepositionMatch[1].trim();
    } else if (context.location) {
      location = context.location;
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
      const toolResult = await executeTool(toolName, toolParams, auth, { isConfirmed: false });

      // If tool requires confirmation, return prompt + confirmation card
      if (toolResult.requiresConfirmation) {
        return {
          reply: `I have prepared this action for you: ${toolResult.summary}. Please confirm below to proceed.`,
          action: toolResult,
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

      return {
        reply,
        action: {
          type: toolName,
          data: toolResult,
        },
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
      const systemInstruction = `You are HireMate JARVIS, a helpful, precise personal AI companion for daily-wage workers and contractors. You speak in natural, friendly language (English, Hindi, Marathi). Be concise and actionable.`;

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
