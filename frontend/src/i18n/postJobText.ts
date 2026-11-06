"use client";

import { useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

// Hindi + Marathi text for the Post a Job / Edit Job page.
// The key is the English text exactly as it appears on the page: [hindi, marathi].
// English is the fallback, so a missing key simply shows English.
type Entry = readonly [hi: string, mr: string];

const DICT: Record<string, Entry> = {
  // ── Page header ─────────────────────────────────────────────────────────
  "Dashboard": ["डैशबोर्ड", "डॅशबोर्ड"],
  "Edit Job": ["नौकरी संपादित करें", "नोकरी संपादित करा"],
  "Post a Job & Request Workers": ["नौकरी पोस्ट करें और कामगार मांगें", "नोकरी पोस्ट करा आणि कामगार मागवा"],
  "Find daily-wage helpers, skilled tradesmen and loaders. Pin your site gate so workers can navigate straight to you.": [
    "दैनिक मजदूर, हुनरमंद कारीगर और लोडर खोजें। अपनी साइट का गेट पिन करें ताकि कामगार सीधे आप तक पहुंच सकें।",
    "रोजंदारी मदतनीस, कुशल कारागीर आणि लोडर शोधा. तुमच्या साइटचे गेट पिन करा म्हणजे कामगार थेट तुमच्यापर्यंत पोहोचू शकतील.",
  ],
  "Standard Posting": ["सामान्य पोस्टिंग", "सामान्य पोस्टिंग"],
  "Urgent Dispatch": ["तुरंत भेजें", "तातडीने पाठवा"],
  "Loading job…": ["नौकरी लोड हो रही है…", "नोकरी लोड होत आहे…"],
  "A completed job cannot be edited.": ["पूरी हो चुकी नौकरी संपादित नहीं की जा सकती।", "पूर्ण झालेली नोकरी संपादित करता येत नाही."],
  "Back to My Jobs": ["मेरी नौकरियों पर वापस", "माझ्या नोकऱ्यांकडे परत"],

  // ── Section 1: basic information ────────────────────────────────────────
  "Basic Information": ["बुनियादी जानकारी", "मूलभूत माहिती"],
  "What kind of work is it and who do you need?": ["काम किस तरह का है और आपको कौन चाहिए?", "कामाचे स्वरूप कोणते आणि तुम्हाला कोण हवे?"],
  "Required": ["आवश्यक", "आवश्यक"],
  "Select worker trade / category": ["कामगार का काम / श्रेणी चुनें", "कामगाराचे काम / श्रेणी निवडा"],
  "Search all jobs — mason, driver, cook, electrician…": ["सभी काम खोजें — मिस्त्री, ड्राइवर, रसोइया, इलेक्ट्रीशियन…", "सर्व कामे शोधा — गवंडी, चालक, स्वयंपाकी, इलेक्ट्रिशियन…"],
  "Search jobs": ["नौकरी खोजें", "नोकरी शोधा"],
  "My Added Jobs": ["मेरी जोड़ी गई नौकरियां", "मी जोडलेल्या नोकऱ्या"],
  "Add other job": ["दूसरी नौकरी जोड़ें", "दुसरी नोकरी जोडा"],
  "Type the job name, e.g. Tent Decorator": ["नौकरी का नाम लिखें, जैसे टेंट डेकोरेटर", "नोकरीचे नाव लिहा, उदा. मंडप डेकोरेटर"],
  "New job name": ["नई नौकरी का नाम", "नवीन नोकरीचे नाव"],
  "Add": ["जोड़ें", "जोडा"],
  "Cancel": ["रद्द करें", "रद्द करा"],
  "Selected job:": ["चुनी गई नौकरी:", "निवडलेली नोकरी:"],
  "Job title / primary task details *": ["नौकरी का शीर्षक / मुख्य काम का विवरण *", "नोकरीचे शीर्षक / मुख्य कामाचा तपशील *"],
  "e.g. Site helpers for shuttering & concrete pouring": ["जैसे शटरिंग और कंक्रीट डालने के लिए साइट हेल्पर", "उदा. शटरिंग आणि काँक्रीट ओतण्यासाठी साइट मदतनीस"],
  "Add the specific task for faster acceptances.": ["जल्दी स्वीकृति के लिए खास काम लिखें।", "जलद स्वीकृतीसाठी विशिष्ट काम लिहा."],
  "Hiring entity / contractor name": ["नियोक्ता / ठेकेदार का नाम", "नियुक्ती करणारी संस्था / कंत्राटदाराचे नाव"],
  "Company or contractor name": ["कंपनी या ठेकेदार का नाम", "कंपनी किंवा कंत्राटदाराचे नाव"],
  "Job category": ["नौकरी की श्रेणी", "नोकरीची श्रेणी"],
  "Other": ["अन्य", "इतर"],
  "Required skills (besides the selected trade)": ["आवश्यक कौशल (चुने गए काम के अलावा)", "आवश्यक कौशल्ये (निवडलेल्या कामाव्यतिरिक्त)"],
  "e.g. Concrete mixing, reading drawings": ["जैसे कंक्रीट मिक्सिंग, ड्रॉइंग पढ़ना", "उदा. काँक्रीट मिक्सिंग, ड्रॉइंग वाचणे"],
  "Experience requirements": ["अनुभव की आवश्यकता", "अनुभवाची आवश्यकता"],
  "e.g. 1+ year on construction sites": ["जैसे निर्माण साइट पर 1+ साल", "उदा. बांधकाम साइटवर 1+ वर्ष"],
  "Job description": ["नौकरी का विवरण", "नोकरीचे वर्णन"],
  "Describe the work, the site and what workers should expect.": ["काम, साइट और कामगारों को क्या उम्मीद रखनी चाहिए, इसका वर्णन करें।", "काम, साइट आणि कामगारांनी काय अपेक्षा ठेवावी याचे वर्णन करा."],

  // ── Section 2: payment ──────────────────────────────────────────────────
  "Payment Information": ["भुगतान की जानकारी", "देयकाची माहिती"],
  "Clear pricing attracts more workers": ["साफ़ दाम से ज़्यादा कामगार आते हैं", "स्पष्ट दरामुळे जास्त कामगार येतात"],
  "Pay amount per worker (₹) *": ["प्रति कामगार भुगतान (₹) *", "प्रति कामगार देयक (₹) *"],
  "Payment type *": ["भुगतान प्रकार *", "देयक प्रकार *"],
  "Worker settlement method *": ["कामगार को भुगतान का तरीका *", "कामगाराला देयक देण्याची पद्धत *"],
  "Hourly": ["प्रति घंटा", "प्रति तास"],
  "Daily": ["दैनिक", "दैनिक"],
  "Weekly": ["साप्ताहिक", "साप्ताहिक"],
  "Monthly": ["मासिक", "मासिक"],
  "Hour": ["घंटा", "तास"],
  "Day": ["दिन", "दिवस"],
  "Week": ["सप्ताह", "आठवडा"],
  "Month": ["महीना", "महिना"],
  "Cash at end of the day": ["दिन के अंत में नकद", "दिवसाच्या शेवटी रोख"],
  "UPI / Bank transfer": ["UPI / बैंक ट्रांसफर", "UPI / बँक ट्रान्सफर"],
  "After work is completed": ["काम पूरा होने के बाद", "काम पूर्ण झाल्यावर"],
  "Payment details": ["भुगतान विवरण", "देयक तपशील"],
  "e.g. Paid by 7 PM at the site office. Bring a bank passbook for UPI payments.": ["जैसे शाम 7 बजे तक साइट ऑफिस में भुगतान। UPI भुगतान के लिए बैंक पासबुक लाएं।", "उदा. संध्याकाळी 7 पर्यंत साइट ऑफिसमध्ये देयक. UPI देयकासाठी बँक पासबुक आणा."],
  "On-site amenities & perks provided": ["साइट पर दी जाने वाली सुविधाएं और लाभ", "साइटवर दिल्या जाणाऱ्या सुविधा आणि फायदे"],
  "Free Lunch / Chai": ["मुफ़्त खाना / चाय", "मोफत जेवण / चहा"],
  "Safety Helmets": ["सुरक्षा हेलमेट", "सुरक्षा हेल्मेट"],
  "Travel Allowance": ["यात्रा भत्ता", "प्रवास भत्ता"],
  "Filtered Water & Shade": ["साफ़ पानी और छाया", "स्वच्छ पाणी आणि सावली"],

  // ── Section 3: work information ─────────────────────────────────────────
  "Work Information": ["काम की जानकारी", "कामाची माहिती"],
  "Type of work, how many workers, date, shift and instructions": ["काम का प्रकार, कितने कामगार, तारीख, शिफ्ट और निर्देश", "कामाचा प्रकार, किती कामगार, तारीख, शिफ्ट आणि सूचना"],
  "Job type": ["नौकरी का प्रकार", "नोकरीचा प्रकार"],
  "One day": ["एक दिन", "एक दिवस"],
  "Multi-day": ["कई दिन", "अनेक दिवस"],
  "Part time": ["पार्ट टाइम", "पार्ट टाइम"],
  "Full time": ["फुल टाइम", "फुल टाइम"],
  "Contract": ["ठेका", "कंत्राट"],
  "Number of workers required *": ["कितने कामगार चाहिए *", "किती कामगार हवेत *"],
  "Fewer workers": ["कम कामगार", "कमी कामगार"],
  "Workers needed": ["ज़रूरी कामगार", "आवश्यक कामगार"],
  "More workers": ["ज़्यादा कामगार", "जास्त कामगार"],
  "Start date": ["शुरू होने की तारीख", "सुरू होण्याची तारीख"],
  "Today": ["आज", "आज"],
  "Immediate Start": ["तुरंत शुरू", "लगेच सुरू"],
  "Tomorrow": ["कल", "उद्या"],
  "Morning 08:00 AM": ["सुबह 08:00", "सकाळी 08:00"],
  "Custom Date": ["अपनी तारीख", "तुमची तारीख"],
  "Multi-day booking": ["कई दिन की बुकिंग", "अनेक दिवसांचे बुकिंग"],
  "Custom work date": ["काम की तारीख", "कामाची तारीख"],
  "Standard Day Shift": ["सामान्य दिन की शिफ्ट", "सामान्य दिवसाची शिफ्ट"],
  "Night Shift": ["रात की शिफ्ट", "रात्रीची शिफ्ट"],
  "Half Day / Hourly": ["आधा दिन / घंटे के हिसाब से", "अर्धा दिवस / तासानुसार"],
  "08:00 AM – 05:00 PM": ["सुबह 08:00 – शाम 05:00", "सकाळी 08:00 – संध्याकाळी 05:00"],
  "08:00 PM – 04:00 AM": ["रात 08:00 – सुबह 04:00", "रात्री 08:00 – पहाटे 04:00"],
  "4 Hours Flexible": ["4 घंटे, समय लचीला", "4 तास, वेळ लवचिक"],
  "9 hrs (includes 1 hr lunch)": ["9 घंटे (1 घंटा लंच सहित)", "9 तास (1 तास जेवणाच्या सुट्टीसह)"],
  "8 hrs night allowance": ["8 घंटे, रात्र भत्ता", "8 तास, रात्र भत्ता"],
  "Short turnaround": ["कम समय का काम", "कमी वेळेचे काम"],
  "Overtime paid extra beyond shift hours": ["शिफ्ट के घंटों से ऊपर ओवरटाइम का अलग भुगतान", "शिफ्टच्या तासांपेक्षा जास्त ओव्हरटाइमचे वेगळे देयक"],
  "Overtime rate per hour": ["प्रति घंटा ओवरटाइम दर", "प्रति तास ओव्हरटाइम दर"],
  "Duration": ["अवधि", "कालावधी"],
  "e.g. 3 days, 2 weeks, ongoing": ["जैसे 3 दिन, 2 हफ्ते, जारी", "उदा. 3 दिवस, 2 आठवडे, चालू"],
  "Work instructions (optional)": ["काम के निर्देश (वैकल्पिक)", "कामाच्या सूचना (ऐच्छिक)"],
  "e.g. Please bring your own steel measuring tape if possible. Must carry a valid Aadhaar card.": ["जैसे हो सके तो अपना स्टील मापने का फीता लाएं। वैध आधार कार्ड साथ रखना ज़रूरी है।", "उदा. शक्य असल्यास स्वतःची स्टील मोजपट्टी आणा. वैध आधार कार्ड सोबत असणे आवश्यक."],

  // ── Section 4: location ─────────────────────────────────────────────────
  "Location Information": ["स्थान की जानकारी", "ठिकाणाची माहिती"],
  "Workers navigate straight to the gate you mark": ["कामगार आपके चिह्नित गेट तक सीधे पहुंचते हैं", "कामगार तुम्ही चिन्हांकित केलेल्या गेटपर्यंत थेट पोहोचतात"],
  "GPS Precision Pin": ["GPS सटीक पिन", "GPS अचूक पिन"],
  "Site address / chowk / landmark *": ["साइट का पता / चौक / लैंडमार्क *", "साइटचा पत्ता / चौक / खूण *"],
  "Type area, street, landmark, chowk…": ["इलाका, गली, लैंडमार्क, चौक लिखें…", "परिसर, गल्ली, खूण, चौक लिहा…"],
  "No results found": ["कोई नतीजा नहीं मिला", "निकाल सापडला नाही"],
  "Try adding the city, e.g.": ["शहर जोड़कर देखें, जैसे", "शहर जोडून पहा, उदा."],
  "Detecting…": ["पता लगा रहे हैं…", "शोधत आहे…"],
  "Detect GPS": ["GPS पता करें", "GPS शोधा"],
  "The address and map pin cannot be changed while workers hold a position on this job.": ["जब तक इस नौकरी पर कामगार नियुक्त हैं, पता और मैप पिन बदला नहीं जा सकता।", "या नोकरीवर कामगार नियुक्त असताना पत्ता आणि मॅप पिन बदलता येत नाही."],
  "Pro Tip:": ["सुझाव:", "टीप:"],
  "Always include the local chowk or labor naka name so workers recognise the meeting spot immediately.": ["हमेशा स्थानीय चौक या लेबर नाके का नाम लिखें ताकि कामगार मिलने की जगह तुरंत पहचान सकें।", "नेहमी स्थानिक चौक किंवा लेबर नाक्याचे नाव लिहा म्हणजे कामगारांना भेटण्याची जागा लगेच ओळखता येईल."],
  "Drag to move gate pin": ["गेट पिन हिलाने के लिए खींचें", "गेट पिन हलवण्यासाठी ओढा"],
  "Tap the map to drop the gate pin": ["गेट पिन लगाने के लिए मैप पर टैप करें", "गेट पिन टाकण्यासाठी मॅपवर टॅप करा"],
  "(exact entrance)": ["(सटीक प्रवेश द्वार)", "(अचूक प्रवेशद्वार)"],
  "No pin yet": ["अभी पिन नहीं लगा", "अजून पिन नाही"],
  "Map View": ["मैप व्यू", "मॅप व्ह्यू"],
  "Full Satellite View": ["पूरा सैटेलाइट व्यू", "पूर्ण सॅटेलाइट व्ह्यू"],
  "City / area": ["शहर / इलाका", "शहर / परिसर"],
  "e.g. Nashik": ["जैसे नाशिक", "उदा. नाशिक"],
  "State": ["राज्य", "राज्य"],
  "e.g. Maharashtra": ["जैसे महाराष्ट्र", "उदा. महाराष्ट्र"],
  "Postal code": ["पिन कोड", "पिन कोड"],
  "Specific gate instructions / landmark note": ["गेट के खास निर्देश / लैंडमार्क नोट", "गेटच्या विशिष्ट सूचना / खूण नोंद"],
  "e.g. Gate 3, opposite the metro pillar": ["जैसे गेट 3, मेट्रो पिलर के सामने", "उदा. गेट 3, मेट्रो खांबासमोर"],
  "On-site gate contact & WhatsApp *": ["साइट गेट संपर्क और व्हाट्सऐप *", "साइट गेट संपर्क आणि व्हॉट्सअॅप *"],

  // ── Urgent card ─────────────────────────────────────────────────────────
  "Activate Urgent Hiring Priority": ["अत्यावश्यक भर्ती प्राथमिकता चालू करें", "तातडीची भरती प्राधान्य सुरू करा"],
  "Marks the job as urgent and pins it to the top of the worker feed so it gets seen first.": ["नौकरी को अत्यावश्यक चिह्नित करता है और कामगारों की सूची में सबसे ऊपर रखता है ताकि वह पहले दिखे।", "नोकरी तातडीची म्हणून चिन्हांकित करते आणि कामगारांच्या यादीत सर्वात वर ठेवते म्हणजे ती आधी दिसते."],

  // ── Summary card ────────────────────────────────────────────────────────
  "ESTIMATED SUMMARY": ["अनुमानित सारांश", "अंदाजित सारांश"],
  "URGENT": ["अत्यावश्यक", "तातडीचे"],
  "STANDARD": ["सामान्य", "सामान्य"],
  "Job Budget": ["नौकरी का बजट", "नोकरीचे बजेट"],
  "Daily Gig Budget": ["दैनिक काम का बजट", "दैनिक कामाचे बजेट"],
  "Live calculation for this booking": ["इस बुकिंग की लाइव गणना", "या बुकिंगची लाईव्ह गणना"],
  "Changes saved ✅": ["बदलाव सहेज लिए गए ✅", "बदल जतन केले ✅"],
  "Job posted ✅": ["नौकरी पोस्ट हो गई ✅", "नोकरी पोस्ट झाली ✅"],
  "View job details": ["नौकरी का विवरण देखें", "नोकरीचा तपशील पहा"],
  "View in My Jobs": ["मेरी नौकरियों में देखें", "माझ्या नोकऱ्यांमध्ये पहा"],
  "Worker pay": ["कामगार भुगतान", "कामगार देयक"],
  "worker": ["कामगार", "कामगार"],
  "workers": ["कामगार", "कामगार"],
  "Shift": ["शिफ्ट", "शिफ्ट"],
  "Overtime (per worker)": ["ओवरटाइम (प्रति कामगार)", "ओव्हरटाइम (प्रति कामगार)"],
  "Payment": ["भुगतान", "देयक"],
  "Total wage budget": ["कुल मजदूरी बजट", "एकूण मजुरी बजेट"],
  "Excludes overtime and any perks you provide": ["ओवरटाइम और आपके दिए गए लाभ शामिल नहीं हैं", "ओव्हरटाइम आणि तुम्ही देत असलेले फायदे समाविष्ट नाहीत"],
  "Saving…": ["सहेज रहे हैं…", "जतन करत आहे…"],
  "Save Changes": ["बदलाव सहेजें", "बदल जतन करा"],
  "Publishing…": ["प्रकाशित हो रहा है…", "प्रकाशित होत आहे…"],
  "Publish & Dispatch Urgently": ["प्रकाशित करें और तुरंत भेजें", "प्रकाशित करा आणि तातडीने पाठवा"],
  "Publish Job": ["नौकरी प्रकाशित करें", "नोकरी प्रकाशित करा"],
  "On-demand daily wage work": ["ज़रूरत पर दैनिक मजदूरी का काम", "गरजेनुसार रोजंदारीचे काम"],

  // ── Job categories ──────────────────────────────────────────────────────
  "Construction & Civil": ["निर्माण और सिविल", "बांधकाम आणि सिव्हिल"],
  "Electrical & Repair": ["बिजली और मरम्मत", "इलेक्ट्रिकल आणि दुरुस्ती"],
  "Plumbing & Mechanical": ["प्लंबिंग और मैकेनिकल", "प्लंबिंग आणि मेकॅनिकल"],
  "Painting & Carpentry": ["पेंटिंग और बढ़ईगीरी", "पेंटिंग आणि सुतारकाम"],
  "Driving & Delivery": ["ड्राइविंग और डिलीवरी", "ड्रायव्हिंग आणि डिलिव्हरी"],
  "Warehouse & Factory": ["गोदाम और फैक्टरी", "गोदाम आणि कारखाना"],
  "Housekeeping & Home Help": ["हाउसकीपिंग और घरेलू सहायता", "घरकाम आणि घरगुती मदत"],
  "Hotel, Food & Retail": ["होटल, खाना और रिटेल", "हॉटेल, खाद्य आणि रिटेल"],
  "Security & Office": ["सुरक्षा और ऑफिस", "सुरक्षा आणि ऑफिस"],
  "Agriculture & Outdoor": ["खेती और बाहरी काम", "शेती आणि बाह्य कामे"],
  "Beauty & Personal Services": ["ब्यूटी और व्यक्तिगत सेवाएं", "ब्युटी आणि वैयक्तिक सेवा"],

  // ── Construction & Civil ────────────────────────────────────────────────
  "Construction Helper": ["निर्माण सहायक", "बांधकाम मदतनीस"],
  "Mason / Rajmistri": ["मिस्त्री / राजमिस्त्री", "गवंडी / राजमिस्त्री"],
  "Concrete Worker": ["कंक्रीट मजदूर", "काँक्रीट कामगार"],
  "Bar Bender / Steel Fixer": ["सरिया बेंडर / स्टील फिक्सर", "बार बेंडर / स्टील फिक्सर"],
  "Shuttering Carpenter": ["शटरिंग बढ़ई", "शटरिंग सुतार"],
  "Scaffolder": ["मचान (स्कैफोल्डिंग) कारीगर", "भारे (स्कॅफोल्डिंग) कारागीर"],
  "Tile / Marble Fitter": ["टाइल / मार्बल फिटर", "टाईल / मार्बल फिटर"],
  "Plasterer": ["प्लास्टर कारीगर", "प्लास्टर कारागीर"],
  "Waterproofing Worker": ["वॉटरप्रूफिंग कारीगर", "वॉटरप्रूफिंग कामगार"],
  "Road Construction Labour": ["सड़क निर्माण मजदूर", "रस्ते बांधकाम मजूर"],
  "Paver Block Worker": ["पेवर ब्लॉक कारीगर", "पेव्हर ब्लॉक कामगार"],
  "JCB / Crane Operator": ["JCB / क्रेन ऑपरेटर", "JCB / क्रेन ऑपरेटर"],
  "Site Supervisor / Mukadam": ["साइट सुपरवाइजर / मुकादम", "साइट सुपरवायझर / मुकादम"],
  "Demolition Labour": ["तोड़फोड़ मजदूर", "पाडकाम मजूर"],
  "Borewell / Well Digger": ["बोरवेल / कुआं खोदने वाला", "बोअरवेल / विहीर खोदणारा"],
  "False Ceiling Worker": ["फॉल्स सीलिंग कारीगर", "फॉल्स सीलिंग कामगार"],
  "Glass & Aluminium Fitter": ["ग्लास और एल्युमिनियम फिटर", "काच आणि अॅल्युमिनियम फिटर"],
  "Stone Cutter": ["पत्थर काटने वाला", "दगड कापणारा"],
  "Brick Layer": ["ईंट चिनाई कारीगर", "वीटकाम कारागीर"],

  // ── Electrical & Repair ─────────────────────────────────────────────────
  "Electrician": ["इलेक्ट्रीशियन", "इलेक्ट्रिशियन"],
  "Wireman": ["वायरमैन", "वायरमन"],
  "AC Technician": ["AC टेक्नीशियन", "AC तंत्रज्ञ"],
  "Fridge / Washing Machine Technician": ["फ्रिज / वॉशिंग मशीन टेक्नीशियन", "फ्रीज / वॉशिंग मशीन तंत्रज्ञ"],
  "Solar Panel Installer": ["सोलर पैनल इंस्टॉलर", "सोलर पॅनेल इन्स्टॉलर"],
  "CCTV Installer": ["CCTV इंस्टॉलर", "CCTV इन्स्टॉलर"],
  "Mobile Repair Technician": ["मोबाइल रिपेयर टेक्नीशियन", "मोबाइल दुरुस्ती तंत्रज्ञ"],
  "TV / Appliance Repair": ["टीवी / उपकरण मरम्मत", "टीव्ही / उपकरण दुरुस्ती"],
  "Inverter / Battery Technician": ["इन्वर्टर / बैटरी टेक्नीशियन", "इन्व्हर्टर / बॅटरी तंत्रज्ञ"],
  "Generator Mechanic": ["जनरेटर मैकेनिक", "जनरेटर मेकॅनिक"],
  "Lift Technician": ["लिफ्ट टेक्नीशियन", "लिफ्ट तंत्रज्ञ"],
  "Lineman / Cable Puller": ["लाइनमैन / केबल खींचने वाला", "लाईनमन / केबल ओढणारा"],
  "Computer / Laptop Technician": ["कंप्यूटर / लैपटॉप टेक्नीशियन", "कॉम्प्युटर / लॅपटॉप तंत्रज्ञ"],
  "RO / Water Purifier Technician": ["RO / वॉटर प्यूरीफायर टेक्नीशियन", "RO / वॉटर प्युरिफायर तंत्रज्ञ"],

  // ── Plumbing & Mechanical ───────────────────────────────────────────────
  "Plumber": ["प्लंबर", "प्लंबर"],
  "Pipe Fitter": ["पाइप फिटर", "पाईप फिटर"],
  "Sanitary Fitter": ["सैनिटरी फिटर", "सॅनिटरी फिटर"],
  "Pump / Motor Mechanic": ["पंप / मोटर मैकेनिक", "पंप / मोटर मेकॅनिक"],
  "Welder": ["वेल्डर", "वेल्डर"],
  "Fabricator": ["फैब्रिकेटर", "फॅब्रिकेटर"],
  "Lathe / Turner": ["लेथ / टर्नर", "लेथ / टर्नर"],
  "Fitter": ["फिटर", "फिटर"],
  "Machine Operator": ["मशीन ऑपरेटर", "मशीन ऑपरेटर"],
  "Gas Pipeline Fitter": ["गैस पाइपलाइन फिटर", "गॅस पाईपलाईन फिटर"],
  "Bike Mechanic": ["बाइक मैकेनिक", "बाईक मेकॅनिक"],
  "Car Mechanic": ["कार मैकेनिक", "कार मेकॅनिक"],
  "Tyre / Puncture Repair": ["टायर / पंक्चर मरम्मत", "टायर / पंक्चर दुरुस्ती"],
  "Car Denter / Painter": ["कार डेंटर / पेंटर", "कार डेंटर / पेंटर"],
  "Auto Electrician": ["ऑटो इलेक्ट्रीशियन", "ऑटो इलेक्ट्रिशियन"],
  "Truck Mechanic": ["ट्रक मैकेनिक", "ट्रक मेकॅनिक"],

  // ── Painting & Carpentry ────────────────────────────────────────────────
  "Painter": ["पेंटर", "रंगारी"],
  "Polisher": ["पॉलिश कारीगर", "पॉलिश कारागीर"],
  "POP / Gypsum Worker": ["POP / जिप्सम कारीगर", "POP / जिप्सम कामगार"],
  "Texture / Wallpaper Painter": ["टेक्सचर / वॉलपेपर पेंटर", "टेक्सचर / वॉलपेपर पेंटर"],
  "Carpenter": ["बढ़ई", "सुतार"],
  "Furniture Maker": ["फर्नीचर कारीगर", "फर्निचर कारागीर"],
  "Modular Kitchen Installer": ["मॉड्यूलर किचन इंस्टॉलर", "मॉड्युलर किचन इन्स्टॉलर"],
  "Sign Board / Flex Installer": ["साइन बोर्ड / फ्लेक्स इंस्टॉलर", "साईन बोर्ड / फ्लेक्स इन्स्टॉलर"],
  "Door & Window Fitter": ["दरवाज़ा और खिड़की फिटर", "दरवाजा आणि खिडकी फिटर"],
  "Upholstery Worker": ["अपहोल्स्ट्री कारीगर", "अपहोल्स्ट्री कारागीर"],

  // ── Driving & Delivery ──────────────────────────────────────────────────
  "Car Driver": ["कार ड्राइवर", "कार ड्रायव्हर"],
  "Auto Rickshaw Driver": ["ऑटो रिक्शा ड्राइवर", "ऑटो रिक्षा चालक"],
  "Truck Driver": ["ट्रक ड्राइवर", "ट्रक चालक"],
  "Tempo / Pickup Driver": ["टेम्पो / पिकअप ड्राइवर", "टेम्पो / पिकअप चालक"],
  "Bus Driver": ["बस ड्राइवर", "बस चालक"],
  "Tractor Driver": ["ट्रैक्टर ड्राइवर", "ट्रॅक्टर चालक"],
  "Cab Driver": ["कैब ड्राइवर", "कॅब चालक"],
  "Forklift Operator": ["फोर्कलिफ्ट ऑपरेटर", "फोर्कलिफ्ट ऑपरेटर"],
  "Bike Delivery Rider": ["बाइक डिलीवरी राइडर", "बाईक डिलिव्हरी रायडर"],
  "Courier Delivery Boy": ["कूरियर डिलीवरी बॉय", "कुरिअर डिलिव्हरी बॉय"],
  "Packers & Movers Helper": ["पैकर्स एंड मूवर्स हेल्पर", "पॅकर्स अँड मूव्हर्स मदतनीस"],
  "Vehicle Cleaner / Helper": ["गाड़ी क्लीनर / हेल्पर", "गाडी क्लीनर / मदतनीस"],
  "Driver Cum Helper": ["ड्राइवर कम हेल्पर", "ड्रायव्हर कम मदतनीस"],
  "School Van Driver": ["स्कूल वैन ड्राइवर", "स्कूल व्हॅन चालक"],

  // ── Warehouse & Factory ─────────────────────────────────────────────────
  "Warehouse & Loader": ["गोदाम और लोडर", "गोदाम आणि लोडर"],
  "Packing Worker": ["पैकिंग कारीगर", "पॅकिंग कामगार"],
  "Factory Worker": ["फैक्टरी मजदूर", "कारखाना कामगार"],
  "General Helper / Labour": ["सामान्य हेल्पर / मजदूर", "सामान्य मदतनीस / मजूर"],
  "Quality Checker": ["क्वालिटी चेकर", "क्वालिटी चेकर"],
  "Sorting Worker": ["छंटाई कारीगर", "वर्गीकरण कामगार"],
  "Hamal / Mathadi (Loading-Unloading)": ["हमाल / माथाडी (लोडिंग-अनलोडिंग)", "हमाल / माथाडी (लोडिंग-अनलोडिंग)"],
  "Tailor / Stitching Worker": ["दर्जी / सिलाई कारीगर", "शिंपी / शिलाई कामगार"],
  "Textile / Power Loom Worker": ["टेक्सटाइल / पावरलूम कारीगर", "टेक्सटाईल / पॉवरलूम कामगार"],
  "Garment Ironing Worker": ["कपड़े प्रेस कारीगर", "कपडे इस्त्री कामगार"],
  "Food Processing Worker": ["फूड प्रोसेसिंग कारीगर", "फूड प्रोसेसिंग कामगार"],
  "Dispatch Helper": ["डिस्पैच हेल्पर", "डिस्पॅच मदतनीस"],
  "Store Keeper": ["स्टोर कीपर", "स्टोअर कीपर"],
  "Printing Press Worker": ["प्रिंटिंग प्रेस कारीगर", "प्रिंटिंग प्रेस कामगार"],
  "Bakery Helper": ["बेकरी हेल्पर", "बेकरी मदतनीस"],
  "Brick Kiln Worker": ["ईंट भट्ठा मजदूर", "वीटभट्टी कामगार"],

  // ── Housekeeping & Home Help ────────────────────────────────────────────
  "House Maid": ["घरेलू सहायिका", "मोलकरीण"],
  "Cook": ["रसोइया", "स्वयंपाकी"],
  "Babysitter / Nanny": ["बेबीसिटर / आया", "बेबीसिटर / आया"],
  "Elderly Care Attendant": ["बुजुर्ग देखभाल सहायक", "वृद्ध काळजी सहाय्यक"],
  "Patient Attendant / Ward Boy": ["मरीज़ सहायक / वार्ड बॉय", "रुग्ण सहाय्यक / वॉर्ड बॉय"],
  "Post-Work Cleaner": ["काम के बाद सफाई कर्मी", "कामानंतर साफसफाई कामगार"],
  "Office Cleaner": ["ऑफिस सफाई कर्मी", "ऑफिस साफसफाई कामगार"],
  "Sweeper": ["झाड़ूवाला / सफाई कर्मी", "झाडूवाला / सफाई कामगार"],
  "Dishwasher": ["बर्तन धोने वाला", "भांडी घासणारा"],
  "Laundry / Dhobi": ["लॉन्ड्री / धोबी", "लॉन्ड्री / धोबी"],
  "Gardener / Mali": ["माली / बागवान", "माळी / बागकाम कामगार"],
  "Pest Control Worker": ["पेस्ट कंट्रोल कर्मचारी", "पेस्ट कंट्रोल कामगार"],
  "Car Washer": ["कार धोने वाला", "कार धुणारा"],
  "Water Tank Cleaner": ["पानी की टंकी सफाई कर्मी", "पाण्याची टाकी साफ करणारा"],
  "Sofa / Carpet Cleaner": ["सोफा / कालीन सफाई कर्मी", "सोफा / कार्पेट साफ करणारा"],
  "Home Shifting Helper": ["घर शिफ्टिंग हेल्पर", "घर शिफ्टिंग मदतनीस"],

  // ── Hotel, Food & Retail ────────────────────────────────────────────────
  "Waiter": ["वेटर", "वेटर"],
  "Kitchen Helper": ["किचन हेल्पर", "किचन मदतनीस"],
  "Chef / Head Cook": ["शेफ / मुख्य रसोइया", "शेफ / मुख्य स्वयंपाकी"],
  "Tandoor / Roti Maker": ["तंदूर / रोटी कारीगर", "तंदूर / पोळी कारागीर"],
  "Chai / Tea Maker": ["चाय बनाने वाला", "चहा बनवणारा"],
  "Cashier": ["कैशियर", "कॅशियर"],
  "Sales Boy / Girl": ["सेल्स बॉय / गर्ल", "सेल्स बॉय / गर्ल"],
  "Shop Helper": ["दुकान हेल्पर", "दुकान मदतनीस"],
  "Street Food Helper": ["स्ट्रीट फूड हेल्पर", "स्ट्रीट फूड मदतनीस"],
  "Catering Boy": ["कैटरिंग बॉय", "केटरिंग बॉय"],
  "Event Helper": ["इवेंट हेल्पर", "इव्हेंट मदतनीस"],
  "Tent / Decoration Worker": ["टेंट / सजावट कारीगर", "मंडप / सजावट कामगार"],
  "Banquet Staff": ["बैंक्वेट स्टाफ", "बँक्वेट स्टाफ"],
  "Sound / DJ Helper": ["साउंड / DJ हेल्पर", "साउंड / DJ मदतनीस"],
  "Hotel Room Boy": ["होटल रूम बॉय", "हॉटेल रूम बॉय"],
  "Delivery Packer": ["डिलीवरी पैकर", "डिलिव्हरी पॅकर"],

  // ── Security & Office ───────────────────────────────────────────────────
  "Security Guard": ["सिक्योरिटी गार्ड", "सिक्युरिटी गार्ड"],
  "Watchman": ["चौकीदार", "वॉचमन"],
  "Gatekeeper": ["गेटकीपर", "गेटकीपर"],
  "Society Caretaker": ["सोसाइटी केयरटेकर", "सोसायटी केअरटेकर"],
  "Peon / Office Boy": ["चपरासी / ऑफिस बॉय", "शिपाई / ऑफिस बॉय"],
  "Receptionist": ["रिसेप्शनिस्ट", "रिसेप्शनिस्ट"],
  "Data Entry Operator": ["डेटा एंट्री ऑपरेटर", "डेटा एंट्री ऑपरेटर"],
  "Telecaller": ["टेलीकॉलर", "टेलिकॉलर"],
  "Office Helper": ["ऑफिस हेल्पर", "ऑफिस मदतनीस"],
  "Lift Operator": ["लिफ्ट ऑपरेटर", "लिफ्ट ऑपरेटर"],
  "Parking Attendant": ["पार्किंग अटेंडेंट", "पार्किंग अटेंडंट"],
  "Bouncer": ["बाउंसर", "बाउन्सर"],

  // ── Agriculture & Outdoor ───────────────────────────────────────────────
  "Farm Labour": ["खेत मजदूर", "शेतमजूर"],
  "Harvesting Worker": ["कटाई मजदूर", "कापणी कामगार"],
  "Sugarcane Cutter": ["गन्ना कटाई मजदूर", "ऊसतोड कामगार"],
  "Fruit / Vegetable Picker": ["फल / सब्ज़ी तोड़ने वाला", "फळे / भाजीपाला तोडणारा"],
  "Nursery / Plant Worker": ["नर्सरी / पौध कर्मी", "रोपवाटिका कामगार"],
  "Dairy / Cattle Worker": ["डेयरी / पशु मजदूर", "डेअरी / पशुपालन कामगार"],
  "Poultry Worker": ["मुर्गी पालन मजदूर", "कुक्कुटपालन कामगार"],
  "Irrigation Worker": ["सिंचाई मजदूर", "सिंचन कामगार"],
  "Fishing Worker": ["मछली पकड़ने वाला", "मासेमारी कामगार"],
  "Tree Cutter / Climber": ["पेड़ काटने / चढ़ने वाला", "झाड कापणारा / चढणारा"],
  "Sheep / Goat Herder": ["भेड़ / बकरी चराने वाला", "मेंढपाळ / शेळ्या चारणारा"],
  "Grain Loader": ["अनाज लोडर", "धान्य लोडर"],

  // ── Beauty & Personal Services ──────────────────────────────────────────
  "Barber / Hair Cutter": ["नाई / हेयर कटर", "न्हावी / हेअर कटर"],
  "Beautician": ["ब्यूटीशियन", "ब्युटिशियन"],
  "Massage Therapist": ["मसाज थेरेपिस्ट", "मसाज थेरपिस्ट"],
  "Mehendi Artist": ["मेहंदी आर्टिस्ट", "मेंदी आर्टिस्ट"],
  "Cobbler": ["मोची", "चांभार"],
  "Tailor (Ladies / Gents)": ["दर्जी (लेडीज़ / जेंट्स)", "शिंपी (लेडीज / जेंट्स)"],
  "Photographer": ["फोटोग्राफर", "फोटोग्राफर"],
  "Videographer": ["वीडियोग्राफर", "व्हिडिओग्राफर"],
  "Pharmacy Helper": ["फार्मेसी हेल्पर", "फार्मसी मदतनीस"],
  "Salon Helper": ["सैलून हेल्पर", "सलून मदतनीस"],

  // ── Shared with the worker Find Jobs page ───────────────────────────────
  "Cash": ["नकद", "रोख"],
  "UPI": ["UPI", "UPI"],
  "After Work": ["काम के बाद", "काम झाल्यावर"],
  "Electrical & Welding": ["बिजली और वेल्डिंग", "इलेक्ट्रिकल आणि वेल्डिंग"],
  "Plumbing": ["प्लंबिंग", "प्लंबिंग"],
  "Cleaning & Housekeeping": ["सफाई और हाउसकीपिंग", "साफसफाई आणि घरकाम"],
  "Food & Hospitality": ["खाना और आतिथ्य", "खाद्य आणि आतिथ्य"],
  "Security": ["सुरक्षा", "सुरक्षा"],
  "Construction & Repair": ["निर्माण और मरम्मत", "बांधकाम आणि दुरुस्ती"],
  "Mechanic": ["मैकेनिक", "मेकॅनिक"],
  "Gardening": ["बागवानी", "बागकाम"],
  "Driver": ["ड्राइवर", "चालक"],
};

// Cities / states that appear in saved job addresses. Street and area names stay as typed.
const PLACES: Record<string, Entry> = {
  "Nashik": ["नाशिक", "नाशिक"],
  "Nasik": ["नाशिक", "नाशिक"],
  "Maharashtra": ["महाराष्ट्र", "महाराष्ट्र"],
  "Pune": ["पुणे", "पुणे"],
  "Mumbai": ["मुंबई", "मुंबई"],
  "Thane": ["ठाणे", "ठाणे"],
  "Nagpur": ["नागपूर", "नागपूर"],
  "Aurangabad": ["औरंगाबाद", "औरंगाबाद"],
  "Chhatrapati Sambhajinagar": ["छत्रपति संभाजीनगर", "छत्रपती संभाजीनगर"],
  "Kolhapur": ["कोल्हापुर", "कोल्हापूर"],
  "Solapur": ["सोलापुर", "सोलापूर"],
  "Jalgaon": ["जलगांव", "जळगाव"],
  "Dhule": ["धुले", "धुळे"],
  "Ahmednagar": ["अहमदनगर", "अहमदनगर"],
  "Nanded": ["नांदेड़", "नांदेड"],
  "Amravati": ["अमरावती", "अमरावती"],
  "India": ["भारत", "भारत"],
};

type Lang = "en" | "hi" | "mr";
type Localized = { en?: string; hi?: string; mr?: string } | undefined;

/** Translates a known label (job name, category, payment method). Unknown text is returned unchanged. */
export function translateKnown(text: string, language: Lang): string {
  if (language === "en" || !text) return text;
  const entry = DICT[text.trim()];
  return entry ? entry[language === "hi" ? 0 : 1] : text;
}

/** "Concrete Worker, Concrete mixing" -> each comma-separated part translated when it is known. */
export function translateList(text: string, language: Lang): string {
  if (language === "en" || !text) return text;
  return text.split(",").map((x) => translateKnown(x.trim(), language)).filter(Boolean).join(", ");
}

/** "Parijat Nagar, Nashik, Maharashtra" -> known cities / states translated, the rest kept. */
export function translatePlace(text: string, language: Lang): string {
  if (language === "en" || !text) return text;
  return text
    .split(",")
    .map((part) => {
      const k = part.trim();
      const entry = PLACES[k];
      return entry ? entry[language === "hi" ? 0 : 1] : k;
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Text saved with a job as { en, hi, mr }. The server stores what the employer typed in all three
 * languages, so when hi / mr are just a copy of the English text, fall back to the dictionary.
 */
export function pickText(value: Localized, language: Lang, kind: "text" | "list" | "place" = "text"): string {
  if (!value) return "";
  const en = value.en || "";
  if (language === "en") return en || value[language] || "";
  const own = value[language];
  if (own && own !== en) return own;
  const base = en || own || "";
  return kind === "list" ? translateList(base, language) : kind === "place" ? translatePlace(base, language) : translateKnown(base, language);
}

/**
 * Translation helpers for the Post a Job page.
 *  - t("English text")            looks the text up in the dictionary above.
 *  - tl("English", "हिंदी", "मराठी")  for sentences built from numbers / variables.
 */
export function usePostJobT() {
  const { language } = useLanguage();

  const t = useCallback(
    (en: string): string => {
      if (language === "en") return en;
      const entry = DICT[en];
      return entry ? entry[language === "hi" ? 0 : 1] : en;
    },
    [language]
  );

  const tl = useCallback(
    (en: string, hi: string, mr: string): string => (language === "hi" ? hi : language === "mr" ? mr : en),
    [language]
  );

  return { t, tl, language };
}