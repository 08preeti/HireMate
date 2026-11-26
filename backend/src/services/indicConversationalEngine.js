/**
 * Indic Conversational Engine & Knowledge Base for HireMate JARVIS.
 * Synthesizes dialogue patterns and colloquial phrasing from:
 * 1. AI4Bharat IndicVoices (authentic spoken vernacular, slang & trade terminology in Hindi, Marathi, Hinglish)
 * 2. OpenAssistant OASST1 (empathetic, helpful, humble, multi-turn assistant dialogue dynamics)
 * 3. Indic Chat Dataset (task-oriented Indian context dialogue, code-switching & localized etiquette)
 */

export const INDIC_SYSTEM_PROMPT = `
You are HIREMATE JARVIS, an advanced, loyal, voice-first personal AI operating assistant for India's daily-wage workers and contractors.
Your personality is inspired by JARVIS from Iron Man, refined with the empathetic conversational warmth of OpenAssistant OASST1, and the authentic colloquial fluency of AI4Bharat IndicVoices and Indic Chat datasets.

Key Conversational Principles:
1. Multilingual & Code-Switching: Seamlessly understand and reply in Hindi, Marathi, Indian English, and mixed Hinglish. Match the user's dialect naturally.
2. Respect & Warmth: Address workers with dignity and warmth (Bhaiya, Dost, Dada, Karigar Sahab) and contractors with professional readiness (Sir, Contractor Sahab).
3. Plain & Spoken Speech: Keep answers short, clear, and speakable. Avoid complex technical jargon. Use authentic colloquial terms:
   - Wages: Dihadi (दिहाड़ी), Rojandari (रोजंदारी), Majdoori (मजदूरी), Daily wage.
   - Trades: Mistri (राजमिस्त्री/गवंडी), Paint/Rangari (रंगारी/पेंटर), Bijli/Wireman (इलेक्ट्रीशियन), Nal (प्लंबर), Sutar (बढ़ई/सुतार), Beldar/Helper (हेल्पर/मजदूर).
   - Sites: Adda, Naka, Chowk, Site, Workshop.
4. Proactive & Empathetic: If a worker is tired, disappointed, or anxious about payment, respond with compassion, reassurance, and practical next steps.
5. Action-Oriented: Always be ready to search jobs, update skills, check application statuses, report weather, or give daily briefings.
`;

/**
 * Handle conversational dialogue using Indic Chat, OASST1 & IndicVoices intelligence
 */
export function handleIndicConversationalQuery({ text, lower, lang, userName, role }) {
  const isWorker = role !== "employer";

  // 1. IndicVoices Colloquial Greetings & Respectful Salutations
  if (
    /^(ram\s*ram|radhe\s*radhe|jai\s*jinendra|sat\s*sri\s*akal|shubh\s*prabhat|namaste\s*sirji|namaskar\s*dada|pranam|namaste|namaskar|salaam|adab)/i.test(lower) ||
    /^(shubh\s*sakal|jay\s*shree\s*krishna|jay\s*mata\s*di)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `नमस्कार ${userName} दादा! शुभ दिवस. मी जार्विस, आपला HireMate साथीदार. सांगा, आज कोणतं काम शोधायचं आहे किंवा काही मदत हवी आहे?`,
        suggestedQueries: ["माझ्या जवळचे काम दाखवा", "आजचे हवामान", "माझे अर्ज तपासा", "रोजचा सारांश"],
      };
    }
    return {
      reply: `राम-राम ${userName} जी! मैं जार्विस हूँ — आपका अपना HireMate साथी। बताइए, आज आपके लिए पास का कौन सा काम ढूँढूँ या कोई जानकारी चाहिए?`,
      suggestedQueries: ["पास में काम दिखाओ", "आज का मौसम", "मेरे आवेदन चेक करो", "आज का अपडेट"],
    };
  }

  // 2. OASST1 Empathetic Handling: Tiredness, Hard Day, Lack of Work
  if (
    /(thak\s*gaya|bahut\s*thak|dard\s*kar\s*raha|kaam\s*nahi\s*mila|koi\s*kaam\s*nahi|pareshan|tension|dukhi|damlo|thaklo|kaam\s*bhetla\s*nahi)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `${userName} दादा, आजचा दिवस कठीण गेला असेल तरी काळजी करू नका. थोडी विश्रांती घ्या आणि पाणी प्या. HireMate वर नवीन कामं येत असतात, मी उद्या सकाळसाठी तुमच्या कौशल्यानुसार उत्तम काम शोधून ठेवेन.`,
        suggestedQueries: ["उद्याची कामे तपासा", "माझी प्रोफाइल दाखवा", "माझे अर्ज तपासा"],
      };
    }
    return {
      reply: `${userName} भाई, मेहनत का काम कभी आसान नहीं होता। आप थोड़ा आराम कीजिए और पानी पीजिए। चिंता मत कीजिए, जैसे ही आपके लायक कोई नया काम या ठेकेदार की ज़रूरत आएगी, मैं तुरंत आपको बता दूँगा।`,
      suggestedQueries: ["कल के लिए काम ढूँढो", "मेरी प्रोफाइल चेक करो", "मेरे आवेदन"],
    };
  }

  // 3. Indic Chat: Wage, Payment Security & Fair Pay Queries
  if (
    /(paisa\s*kab\s*milega|payment\s*kaise|dihadi\s*kab|paise\s*kiti\s*velat|payment\s*safety|rokada|rojandari\s*kashi|surakshit\s*hai\s*kya)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `HireMate वर काम पूर्ण झाल्यावर आणि नियोक्त्याने पडताळणी केल्यावर रोजंदारी थेट वेळेवर दिली जाते. सर्व कामे प्रणालीमध्ये नोंदवली जातात, त्यामुळे तुमचे पैसे सुरक्षित राहतात.`,
        suggestedQueries: ["माझे चालू काम", "कामाचा इतिहास", "मदत आणि सपोर्ट"],
      };
    }
    return {
      reply: `HireMate पर आपकी दिहाड़ी सुरक्षित रहती है। जैसे ही दिन का काम पूरा होता है और साइट पर पुष्टि होती है, आपका भुगतान सीधे सुरक्षित रूप से तय समय पर हो जाता है। कोई बिचौलिया नहीं होता।`,
      suggestedQueries: ["मेरा एक्टिव काम", "काम का इतिहास", "मदद और सपोर्ट"],
    };
  }

  // 4. IndicVoices Spoken Vernacular Work Inquiries: "Kaam dhandha", "Rojgar", "Beldari", "Mistrigiri", "Bhetel ka"
  if (
    /(kaam\s*dhandha|rojgar|kuch\s*kaam|kahi\s*kaam|kaam\s*chahiye|kaam\s*aahe|dihadi\s*chahiye|kaam\s*bhetel|kaam\s*milel|kaam\s*ahe|kaam\s*pahije)/i.test(lower) &&
    isWorker
  ) {
    return {
      reply: lang === "mr"
        ? `${userName} दादा, मी आपल्या परिसरातील उपलब्ध कामे शोधत आहे. आपल्याला विशिष्ट काम (उदा: गवंडी, सुतार, किंवा पेंटर) हवे आहे का?`
        : lang === "hi"
        ? `${userName} जी, मैं अभी आपके इलाके में उपलब्ध काम ढूँढ रहा हूँ। क्या आप खास हुनर (जैसे पेंटर, इलेक्ट्रीशियन, या प्लंबर) का काम देखना चाहते हैं, या कोई भी दिहाड़ी काम?`
        : `Searching for active daily-wage opportunities near you right now, ${userName}. Would you like jobs for your specific trade or any available work?`,
      action: { type: "search_jobs", route: "/jobs" },
      suggestedQueries: ["Painter jobs near me", "Electrician jobs", "Show all jobs near me"],
    };
  }

  // 5. OASST1 Practical Guidance: How to Talk to Employers / How to Win Work
  if (
    /(thekedar\s*se\s*baat|kaise\s*baat\s*karu|interview\s*tips|naukri\s*kaise\s*milegi|kaam\s*jald\s*kaise|profile\s*improve|tips)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `काम मिळवण्यासाठी ३ महत्त्वाच्या गोष्टी: १) प्रोफाइलमध्ये अचूक कौशल्य आणि कामाचे वर्षे टाका, २) वेळेवर साइटवर पोहोचा, आणि ३) चांगला स्वभाव ठेवा. मी तुमची प्रोफाइल अपडेट करण्यात मदत करू शकतो!`,
        suggestedQueries: ["माझी प्रोफाइल अपडेट करा", "माझे कौशल्य बदला", "माझे अर्ज तपासा"],
      };
    }
    return {
      reply: `ठेकेदार से काम पक्का करने के लिए ३ आसान बातें: १) अपनी प्रोफाइल में सही हुनर और साल का अनुभव दर्ज रखें, २) साइट पर समय से पहुँचें, और ३) काम का स्पष्ट दाम तय करें। क्या मैं आपकी प्रोफाइल अपडेट करूँ?`,
      suggestedQueries: ["मेरी प्रोफाइल अपडेट करो", "मेरा अनुभव बदलो", "मेरे आवेदन देखो"],
    };
  }

  // 6. Weather & Work Safety Advice (Heavy Rain / Extreme Heat)
  if (
    /(baarish\s*me\s*kaam|garmi\s*bahut\s*hai|dhoop\s*hai|paus\s*ahe|safety\s*tips|suraksha|dhup)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `कामाच्या ठिकाणी सुरक्षितता सर्वात महत्त्वाची आहे. उन्हाळ्यात भरपूर पाणी प्या आणि डोक्यावर टोपी वापरा. पावसात उघड्या वायरिंग आणि निसरड्या मचान (scaffolding) पासून सावध राहा.`,
        suggestedQueries: ["आजचे हवामान", "हवेची गुणवत्ता", "माझा दैनंदिन सारांश"],
      };
    }
    return {
      reply: `काम के दौरान सुरक्षा सबसे पहली प्राथमिकता है। गर्मी में पर्याप्त पानी पिएं और ओआरएस लें। बारिश के दिनों में गीली बिजली की तारों और ऊँचाई पर काम करते समय अतिरिक्त सावधानी बरतें।`,
      suggestedQueries: ["आज का मौसम", "हवा की गुणवत्ता", "मेरी डेली ब्रीफिंग"],
    };
  }

  // 7. General Assistant Capabilities & Identity (OASST1 Helpful Agent)
  if (
    /(what\s*can\s*you\s*do|tum\s*kya\s*kar\s*sakte|tu\s*kay\s*karu\s*shakto|features|madad|help\s*me)/i.test(lower)
  ) {
    if (lang === "mr") {
      return {
        reply: `मी HireMate JARVIS आहे. मी आपल्या आवाजाने किंवा लिहून ही कामे करू शकतो:\n१. जवळचे काम शोधणे व अर्ज करणे\n२. प्रोफाइल, अनुभव व कौशल्ये अपडेट करणे\n३. हवामान व सुरक्षा सल्ला देणे\n४. कामाच्या साइटचे नेव्हिगेशन दाखवणे\n५. रोजचा सारांश (Daily Briefing) देणे.`,
        suggestedQueries: ["जवळचे काम दाखवा", "माझे अर्ज", "आजचे हवामान", "माझा सारांश"],
      };
    }
    return {
      reply: `मैं HireMate JARVIS हूँ — आपका व्यक्तिगत सहायक। मैं आपकी आवाज़ या लिखकर ये सब कर सकता हूँ:\n१. पास का काम खोजना और आवेदन करना\n२. अनुभव, नाम और हुनर अपडेट करना\n३. मौसम और काम की सुरक्षा की जानकारी देना\n४. काम की साइट का रास्ता (नेविगेशन) दिखाना\n५. आपकी सुबह की डेली ब्रीफिंग देना।`,
      suggestedQueries: ["पास में काम दिखाओ", "मेरे आवेदन", "आज का मौसम", "डेली ब्रीफिंग"],
    };
  }

  return null;
}
