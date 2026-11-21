/**
 * Dynamic Greeting Service for HireMate JARVIS.
 * Generates personalized, time-of-day and context-aware spoken & written greetings.
 */

import { ROLES } from "../constants/roles.js";
import { getUnreadCount } from "./notificationService.js";
import { getWeatherAndAirQuality } from "./weatherService.js";

/**
 * Determine greeting period based on local hour (0-23)
 */
function getTimePeriod(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const GREETINGS = {
  morning: {
    en: [
      "Good morning, {name}! Welcome to HireMate. How are you doing today?",
      "Good morning, {name}! Ready to conquer today's opportunities? Let's check what's lined up for you.",
      "A very pleasant morning, {name}! I hope your day is starting off well.",
    ],
    hi: [
      "शुभ प्रभात, {name}! HireMate में आपका स्वागत है। आज आप कैसे हैं?",
      "सुप्रभात, {name}! आज के अवसरों के लिए क्या आप तैयार हैं? चलिए देखते हैं आज आपके लिए क्या नया है।",
      "नमस्ते {name}, शुभ प्रभात! आशा है कि आपका दिन बहुत अच्छा शुरू हो रहा है।",
    ],
    mr: [
      "शुभ सकाळ, {name}! HireMate मध्ये आपले स्वागत आहे. आज कसे आहात?",
      "सुप्रभात, {name}! आजच्या नवीन संधींसाठी सज्ज आहात का? चला आजचे अपडेट्स पाहूया.",
      "नमस्कार {name}, शुभ सकाळ! आशा आहे की आजचा दिवस छान सुरू झाला आहे.",
    ],
  },
  afternoon: {
    en: [
      "Good afternoon, {name}! How is your day going so far?",
      "Good afternoon, {name}! Checking in to see how your schedule is shaping up today.",
      "Hello {name}, good afternoon! Let's see what updates we have for you.",
    ],
    hi: [
      "शुभ दोपहर, {name}! आपका आज का दिन कैसा जा रहा है?",
      "नमस्ते {name}, शुभ दोपहर! चलिए देखते हैं आपके आज के क्या अपडेट्स हैं।",
      "हेलो {name}, दोपहर की राम-राम! क्या आज के काम के बारे में कोई मदद चाहिए?",
    ],
    mr: [
      "शुभ दुपार, {name}! आजचा दिवस कसा चालू आहे?",
      "नमस्कार {name}, शुभ दुपार! चला आजचे कामाचे अपडेट्स तपासूया.",
      "हेलो {name}, दुपारच्या शुभेच्छा! आपल्याला आज काही मदत हवी आहे का?",
    ],
  },
  evening: {
    en: [
      "Good evening, {name}! Your day's work is wrapping up. Would you like to review your updates?",
      "Good evening, {name}! How was your day? I have some fresh updates ready for you.",
      "Hello {name}, good evening! Let's review today's achievements and tomorrow's opportunities.",
    ],
    hi: [
      "शुभ संध्या, {name}! आज का काम लगभग पूरा हो चुका है। क्या आप आज के अपडेट्स देखना चाहेंगे?",
      "नमस्ते {name}, शुभ संध्या! आज का दिन कैसा रहा? आपके लिए कुछ नए अपडेट्स तैयार हैं।",
      "हेलो {name}, शाम की नमस्ते! कल के अवसरों के बारे में जांच करें?",
    ],
    mr: [
      "शुभ संध्याकाळ, {name}! आजचे काम पूर्ण होत आले आहे. आजचे अपडेट्स तपासायचे आहेत का?",
      "नमस्कार {name}, शुभ संध्याकाळ! आजचा दिवस कसा गेला? आपल्यासाठी काही नवीन अपडेट्स आहेत.",
      "हेलो {name}, संध्याकाळच्या शुभेच्छा! उद्याच्या संधी तपासायच्या का?",
    ],
  },
  night: {
    en: [
      "Hello, {name}! You're working late today. Would you like a quick summary before you rest?",
      "Good night, {name}! HireMate is here if you need to schedule tomorrow's tasks or review open work.",
      "Hello {name}! Up late tonight? Let me know if you need to check any pending notifications.",
    ],
    hi: [
      "नमस्ते {name}! आप आज काफी देर तक काम कर रहे हैं। क्या सोने से पहले आज की समरी देखना चाहेंगे?",
      "शुभ रात्रि, {name}! कल के कामों की योजना बनाने के लिए मैं यहाँ हूँ।",
      "हेलो {name}! क्या कल के लिए कोई जरूरी सूचना चेक करनी है?",
    ],
    mr: [
      "नमस्कार {name}! आपण आज रात्री उशिरापर्यंत काम करत आहात. विश्रांती घेण्यापूर्वी काही सारांश पाहायचा आहे का?",
      "शुभ रात्री, {name}! उद्याच्या कामांचे नियोजन करण्यासाठी मी येथे उपलब्ध आहे.",
      "हेलो {name}! उद्यासाठी काही महत्त्वाचे अपडेट्स तपासायचे आहेत का?",
    ],
  },
};

export async function generatePersonalizedGreeting(auth, userDoc, { latitude, longitude, timezoneOffset } = {}) {
  const role = auth?.role || "worker";
  const name = userDoc?.name || (role === ROLES.EMPLOYER ? "Contractor" : "Worker");
  const preferredLang = (userDoc?.preferredLanguage || "en").toLowerCase();
  const lang = ["en", "hi", "mr"].includes(preferredLang) ? preferredLang : "en";

  // Calculate local time taking into account timezone offset in minutes if provided
  let now = new Date();
  if (typeof timezoneOffset === "number") {
    // client timezone offset in minutes
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    now = new Date(utc - timezoneOffset * 60000);
  }
  const hour = now.getHours();
  const period = getTimePeriod(hour);

  // Pick variation randomly
  const pool = GREETINGS[period][lang] || GREETINGS[period]["en"];
  const template = pool[Math.floor(Math.random() * pool.length)];
  let spokenGreeting = template.replace("{name}", name);

  // Weather context
  let weather = null;
  let weatherNote = "";
  try {
    weather = await getWeatherAndAirQuality({ latitude, longitude });
    if (weather) {
      if (lang === "hi") {
        weatherNote = ` आपके क्षेत्र में मौसम ${weather.temperature}°C और ${weather.weatherDesc} है।`;
      } else if (lang === "mr") {
        weatherNote = ` आपल्या परिसरात तापमान ${weather.temperature}°C आणि वातावरण ${weather.weatherDesc} आहे.`;
      } else {
        weatherNote = ` It is currently ${weather.temperature}°C and ${weather.weatherDesc} in your area.`;
      }
    }
  } catch (err) {
    // Ignore weather failures
  }

  // Notification count
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadCount(auth);
  } catch {
    unreadCount = 0;
  }

  let promptNote = "";
  if (unreadCount > 0) {
    if (lang === "hi") {
      promptNote = ` आपके पास ${unreadCount} नई सूचनाएँ हैं।`;
    } else if (lang === "mr") {
      promptNote = ` आपल्याकडे ${unreadCount} नवीन सूचना आहेत.`;
    } else {
      promptNote = ` You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`;
    }
  }

  const fullGreeting = `${spokenGreeting}${weatherNote}${promptNote}`;

  return {
    period,
    name,
    role,
    language: lang,
    spokenGreeting: fullGreeting,
    shortGreeting: spokenGreeting,
    weather,
    unreadNotifications: unreadCount,
    timestamp: new Date().toISOString(),
    suggestedActions: role === ROLES.WORKER
      ? [
          { label: "Show jobs near me", query: "Show me jobs near me" },
          { label: "Today's weather", query: "What is the weather today?" },
          { label: "My applications", query: "Check my application status" },
          { label: "Daily briefing", query: "Give me my daily briefing" },
        ]
      : [
          { label: "My job posts", query: "Show my active job posts" },
          { label: "Post a new job", query: "Help me post a new job" },
          { label: "Review applicants", query: "Review my job applicants" },
          { label: "Daily briefing", query: "Give me my employer daily briefing" },
        ],
  };
}
