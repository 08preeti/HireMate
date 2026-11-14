import type { Language } from "@/types";
import type { AppNotification } from "@/types/notifications";

const COPY: Record<string, Record<Language, [string, string]>> = {
  job_match: { en: ["New job matching your skills", "A new job matches your skills."], hi: ["आपके कौशल से मेल खाती नई नौकरी", "आपके कौशल के अनुसार एक नई नौकरी उपलब्ध है।"], mr: ["तुमच्या कौशल्यानुसार नवीन नोकरी", "तुमच्या कौशल्यानुसार एक नवीन नोकरी उपलब्ध आहे."] },
  application_submitted: { en: ["Application submitted", "Your job application was submitted successfully."], hi: ["आवेदन भेजा गया", "आपका नौकरी के लिए आवेदन सफलतापूर्वक भेजा गया।"], mr: ["अर्ज पाठवला", "तुमचा नोकरीसाठीचा अर्ज यशस्वीपणे पाठवला आहे."] },
  application_accepted: { en: ["Application accepted", "The employer accepted your application. Check your new offer."], hi: ["आवेदन स्वीकार किया गया", "नियोक्ता ने आपका आवेदन स्वीकार किया है। नया ऑफर देखें।"], mr: ["अर्ज स्वीकारला", "मालकाने तुमचा अर्ज स्वीकारला आहे. नवीन ऑफर पहा."] },
  application_declined: { en: ["Application declined", "The employer declined your application."], hi: ["आवेदन अस्वीकार किया गया", "नियोक्ता ने आपका आवेदन अस्वीकार कर दिया।"], mr: ["अर्ज नाकारला", "मालकाने तुमचा अर्ज नाकारला आहे."] },
  new_application: { en: ["New application", "A worker has applied for your job."], hi: ["नया आवेदन", "एक कामगार ने आपकी नौकरी के लिए आवेदन किया है।"], mr: ["नवीन अर्ज", "एका कामगाराने तुमच्या नोकरीसाठी अर्ज केला आहे."] },
  worker_on_the_way: { en: ["Worker is on the way", "The worker has started travelling to the job location."], hi: ["कामगार रास्ते में है", "कामगार नौकरी के स्थान के लिए निकल चुका है।"], mr: ["कामगार मार्गावर आहे", "कामगार कामाच्या ठिकाणी येण्यासाठी निघाला आहे."] },
  worker_arrived: { en: ["Worker has arrived", "The worker has reached the job location."], hi: ["कामगार पहुँच गया", "कामगार नौकरी के स्थान पर पहुँच गया है।"], mr: ["कामगार पोहोचला", "कामगार कामाच्या ठिकाणी पोहोचला आहे."] },
  worker_completed: { en: ["Work completed", "The worker marked the job as completed."], hi: ["काम पूरा हुआ", "कामगार ने काम पूरा होने की जानकारी दी है।"], mr: ["काम पूर्ण झाले", "कामगाराने काम पूर्ण झाल्याचे कळवले आहे."] },
  offer_confirmed: { en: ["Offer confirmed", "The worker confirmed the job offer."], hi: ["ऑफर की पुष्टि हुई", "कामगार ने नौकरी का ऑफर स्वीकार कर लिया है।"], mr: ["ऑफर निश्चित झाला", "कामगाराने नोकरीची ऑफर निश्चित केली आहे."] },
  offer_rejected: { en: ["Offer rejected", "The worker rejected the job offer."], hi: ["ऑफर अस्वीकार किया गया", "कामगार ने नौकरी का ऑफर अस्वीकार कर दिया।"], mr: ["ऑफर नाकारला", "कामगाराने नोकरीची ऑफर नाकारली आहे."] },
  application_withdrawn: { en: ["Application withdrawn", "A worker withdrew their application."], hi: ["आवेदन वापस लिया गया", "कामगार ने अपना आवेदन वापस ले लिया।"], mr: ["अर्ज मागे घेतला", "कामगाराने आपला अर्ज मागे घेतला आहे."] },
  application_cancelled: { en: ["Job cancelled", "The employer cancelled this work."], hi: ["काम रद्द किया गया", "नियोक्ता ने यह काम रद्द कर दिया।"], mr: ["काम रद्द केले", "मालकाने हे काम रद्द केले आहे."] },
  job_closed: { en: ["Job closed", "This job is no longer accepting applications."], hi: ["नौकरी बंद", "इस नौकरी के लिए अब आवेदन स्वीकार नहीं किए जा रहे हैं।"], mr: ["नोकरी बंद", "या नोकरीसाठी आता अर्ज स्वीकारले जात नाहीत."] },
  job_updated: { en: ["Job updated", "The job details have changed. Review the updated information."], hi: ["नौकरी अपडेट हुई", "नौकरी की जानकारी बदली है। नई जानकारी देखें।"], mr: ["नोकरी अपडेट झाली", "नोकरीची माहिती बदलली आहे. नवीन माहिती तपासा."] },
  job_filled: { en: ["Job filled", "All available positions have been filled."], hi: ["नौकरी के पद भर गए", "सभी उपलब्ध पद भर गए हैं।"], mr: ["नोकरीची पदे भरली", "सर्व उपलब्ध पदे भरली आहेत."] },
  completion_requested: { en: ["Completion requested", "The worker says the work is finished. Please review it."], hi: ["काम पूरा होने की पुष्टि मांगी", "कामगार ने काम पूरा होने की जानकारी दी है। कृपया जाँचें।"], mr: ["काम पूर्ण झाल्याची विनंती", "कामगाराने काम पूर्ण झाल्याचे कळवले आहे. कृपया तपासा."] },
  completion_approved: { en: ["Work completed", "The employer confirmed that the work is complete."], hi: ["काम पूरा होने की पुष्टि", "नियोक्ता ने काम पूरा होने की पुष्टि की है।"], mr: ["काम पूर्ण झाल्याची पुष्टी", "मालकाने काम पूर्ण झाल्याची पुष्टी केली आहे."] },
  completion_rejected: { en: ["Completion not accepted", "The employer has not accepted the completion request."], hi: ["काम पूरा होना स्वीकार नहीं हुआ", "नियोक्ता ने काम पूरा होने की पुष्टि स्वीकार नहीं की।"], mr: ["काम पूर्णत्व स्वीकारले नाही", "मालकाने काम पूर्ण झाल्याची विनंती स्वीकारली नाही."] },
  review_received: { en: ["New review received", "You received a new review."], hi: ["नई समीक्षा मिली", "आपको एक नई समीक्षा मिली है।"], mr: ["नवीन अभिप्राय मिळाला", "तुम्हाला नवीन अभिप्राय मिळाला आहे."] },
};

export function localizedNotification(n: AppNotification, language: Language) {
  const copy = COPY[n.type]?.[language];
  return copy ? { title: copy[0], message: copy[1] } : { title: n.title, message: n.message };
}
