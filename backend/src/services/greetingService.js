/**
 * Dynamic Greeting Service for HireMate JARVIS.
 * Generates personalized, time-of-day and context-aware spoken & written greetings.
 * Queries actual database records for real application activity, weather, and notifications.
 */

import { ROLES } from "../constants/roles.js";
import { getUnreadCount } from "./notificationService.js";
import { getWeatherAndAirQuality } from "./weatherService.js";
import Application from "../models/Application.js";

/**
 * Determine greeting period based on local hour (0-23)
 */
function getTimePeriod(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export async function generatePersonalizedGreeting(auth, userDoc, { latitude, longitude, timezoneOffset } = {}) {
  const role = auth?.role || "worker";
  const name = userDoc?.name || (role === ROLES.EMPLOYER ? (userDoc?.companyName || "Contractor") : "Worker");
  const preferredLang = (userDoc?.preferredLanguage || "en").toLowerCase();
  const lang = ["en", "hi", "mr"].includes(preferredLang) ? preferredLang : "en";

  // Calculate local time taking into account timezone offset in minutes if provided
  let now = new Date();
  if (typeof timezoneOffset === "number") {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    now = new Date(utc - timezoneOffset * 60000);
  }
  const hour = now.getHours();
  const period = getTimePeriod(hour);

  const periodLabels = {
    morning: { en: "morning", hi: "प्रभात", mr: "सकाळ" },
    afternoon: { en: "afternoon", hi: "दोपहर", mr: "दुपार" },
    evening: { en: "evening", hi: "संध्या", mr: "संध्याकाळ" },
    night: { en: "night", hi: "रात्रि", mr: "रात्र" },
  };
  const periodStr = periodLabels[period][lang] || periodLabels[period].en;

  // Real weather context
  let weather = null;
  try {
    weather = await getWeatherAndAirQuality({ latitude, longitude });
  } catch (err) {
    // Graceful weather fallback
  }

  // Real notification count
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadCount(auth);
  } catch {
    unreadCount = 0;
  }

  let fullGreeting = "";
  let shortGreeting = "";

  if (role === ROLES.EMPLOYER) {
    // ── Employer Greeting Logic ──
    let pendingApps = 0;
    try {
      if (auth?.id) {
        pendingApps = await Application.countDocuments({
          employer: auth.id,
          status: "pending",
        });
      }
    } catch {
      pendingApps = 0;
    }

    if (lang === "hi") {
      shortGreeting = `नमस्ते ${name}! शुभ ${periodStr}।`;
      if (pendingApps > 0) {
        fullGreeting = `शुभ ${periodStr}! HireMate में आपका स्वागत है, ${name}। आपके जॉब पोस्ट्स के लिए ${pendingApps} नए आवेदन प्राप्त हुए हैं। क्या आप उनकी समीक्षा करना चाहेंगे?`;
      } else {
        fullGreeting = `शुभ ${periodStr}! HireMate में आपका स्वागत है, ${name}। आपके सभी जॉब पोस्ट्स अपडेटेड हैं। क्या मैं नए कामगार ढूँढने या नया काम पोस्ट करने में मदद करूँ?`;
      }
    } else if (lang === "mr") {
      shortGreeting = `नमस्कार ${name}! शुभ ${periodStr}।`;
      if (pendingApps > 0) {
        fullGreeting = `शुभ ${periodStr}! HireMate मध्ये आपले स्वागत आहे, ${name}। आपल्या जॉब पोस्ट्ससाठी ${pendingApps} नवीन अर्ज प्राप्त झाले आहेत. ते तपासायचे आहेत का?`;
      } else {
        fullGreeting = `शुभ ${periodStr}! HireMate मध्ये आपले स्वागत आहे, ${name}। आपले सर्व जॉब पोस्ट्स अद्ययावत आहेत. आपण नवीन कामगार पाहू इच्छिता की नवीन काम पोस्ट करू इच्छिता?`;
      }
    } else {
      shortGreeting = `Good ${periodStr}, ${name}!`;
      if (pendingApps > 0) {
        fullGreeting = `Good ${periodStr}, ${name}! Welcome back. You have received ${pendingApps} new application${pendingApps > 1 ? "s" : ""} for your job posts. Would you like me to review them?`;
      } else {
        fullGreeting = `Good ${periodStr}, ${name}! Welcome back to HireMate. All your job posts are currently up to date. Would you like me to review candidate activity or help you post a new job?`;
      }
    }
  } else {
    // ── Worker Greeting Logic ──
    let acceptedOfferCount = 0;
    try {
      if (auth?.id) {
        acceptedOfferCount = await Application.countDocuments({
          $or: [{ worker: auth.id }, ...(auth.phone ? [{ applicantContact: auth.phone }] : [])],
          status: "accepted",
        });
      }
    } catch {
      acceptedOfferCount = 0;
    }

    if (lang === "hi") {
      shortGreeting = `नमस्ते ${name}! शुभ ${periodStr}।`;
      if (acceptedOfferCount > 0) {
        fullGreeting = `नमस्ते ${name}! शुभ ${periodStr}। HireMate में आपका स्वागत है। आपके लिए एक नौकरी का ऑफर आया हुआ है! क्या आप इसे देखना चाहेंगे?`;
      } else if (weather) {
        fullGreeting = `नमस्ते ${name}! शुभ ${periodStr}। HireMate में आपका स्वागत है। आज का दिन कैसा जा रहा है? आपके क्षेत्र में मौसम ${weather.temperature}°C और ${weather.weatherDesc} है। क्या आप आज के नए काम देखना चाहेंगे?`;
      } else {
        fullGreeting = `नमस्ते ${name}! शुभ ${periodStr}। HireMate में आपका स्वागत है। आज का दिन कैसा जा रहा है? क्या मैं आपके लिए आज के नए काम ढूँढूँ?`;
      }
    } else if (lang === "mr") {
      shortGreeting = `नमस्कार ${name}! शुभ ${periodStr}।`;
      if (acceptedOfferCount > 0) {
        fullGreeting = `नमस्कार ${name}! शुभ ${periodStr}। HireMate मध्ये आपले स्वागत आहे. आपल्यासाठी एका कामाची नवीन ऑफर आली आहे! ती तपासायची आहे का?`;
      } else if (weather) {
        fullGreeting = `नमस्कार ${name}! शुभ ${periodStr}। HireMate मध्ये आपले स्वागत आहे. आजचा दिवस कसा चालू आहे? आपल्या परिसरात तापमान ${weather.temperature}°C आणि वातावरण ${weather.weatherDesc} आहे. आपण आजच्या नवीन संधी तपासू इच्छिता का?`;
      } else {
        fullGreeting = `नमस्कार ${name}! शुभ ${periodStr}। HireMate मध्ये आपले स्वागत आहे. आजचा दिवस कसा चालू आहे? मी आजचे काम तपासू का?`;
      }
    } else {
      shortGreeting = `Hello ${name}! Good ${periodStr}.`;
      if (acceptedOfferCount > 0) {
        fullGreeting = `Hello ${name}! Good ${periodStr}. Welcome back to HireMate. You have an accepted job offer waiting for your confirmation! Would you like me to show you the details?`;
      } else if (weather) {
        fullGreeting = `Hello ${name}! Good ${periodStr}. Welcome back to HireMate. How is your day going? The weather in your selected area is currently ${weather.temperature} degrees and ${weather.weatherDesc}. Would you like me to check today's job opportunities?`;
      } else {
        fullGreeting = `Hello ${name}! Good ${periodStr}. Welcome back to HireMate. How is your day going? Would you like me to check today's job opportunities for you?`;
      }
    }
  }

  // Append unread notification alert if present
  if (unreadCount > 0) {
    if (lang === "hi") {
      fullGreeting += ` (आपके पास ${unreadCount} नई सूचनाएँ हैं)`;
    } else if (lang === "mr") {
      fullGreeting += ` (आपल्याकडे ${unreadCount} नवीन सूचना आहेत)`;
    } else {
      fullGreeting += ` (You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""})`;
    }
  }

  return {
    period,
    name,
    role,
    language: lang,
    spokenGreeting: fullGreeting,
    shortGreeting,
    weather,
    unreadNotifications: unreadCount,
    timestamp: new Date().toISOString(),
    suggestedActions: role === ROLES.WORKER
      ? [
          { label: "Show jobs near me", query: "Show me jobs near me" },
          { label: "My applications", query: "Check my application status" },
          { label: "Today's weather", query: "What is the weather today?" },
          { label: "Daily briefing", query: "Give me my daily briefing" },
        ]
      : [
          { label: "Review applicants", query: "Review my job applicants" },
          { label: "Show active jobs", query: "Show my active jobs" },
          { label: "Post a job", query: "Help me post a new job" },
          { label: "Daily briefing", query: "Give me my employer daily briefing" },
        ],
  };
}
