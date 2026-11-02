"use client";

import { Fragment, useCallback, type ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/types";

// Text for the employer pages (Dashboard + Applications) in English, Hindi and Marathi.
// Placeholders look like {name}. Text wrapped in **double stars** is shown in bold (see `rich`).
// Plural pairs end in _1 (exactly one) and _n (everything else) — use `trp`.
type Entry = readonly [en: string, hi: string, mr: string];

const TEXT = {
  // ── Greetings & hero ────────────────────────────────────────────────────
  greet_morning: ["Good morning", "शुभ प्रभात", "शुभ प्रभात"],
  greet_afternoon: ["Good afternoon", "शुभ दोपहर", "शुभ दुपार"],
  greet_evening: ["Good evening", "शुभ संध्या", "शुभ संध्याकाळ"],
  workersCount_1: ["{n} worker", "{n} कामगार", "{n} कामगार"],
  workersCount_n: ["{n} workers", "{n} कामगार", "{n} कामगार"],
  activeJobsCount_1: ["{n} active job", "{n} सक्रिय नौकरी", "{n} सक्रिय नोकरी"],
  activeJobsCount_n: ["{n} active jobs", "{n} सक्रिय नौकरियां", "{n} सक्रिय नोकऱ्या"],
  hero_live: ["You have **{workers}** active across **{jobs}**.", "आपकी **{jobs}** में **{workers}** सक्रिय हैं।", "तुमच्या **{jobs}** मध्ये **{workers}** सक्रिय आहेत."],
  hero_open: ["You have **{jobs}** open for applicants.", "आपकी **{jobs}** आवेदकों के लिए खुली हैं।", "तुमच्या **{jobs}** अर्जदारांसाठी खुल्या आहेत."],
  hero_empty: ["Post a job to start receiving applicants.", "आवेदक पाने के लिए नौकरी पोस्ट करें।", "अर्जदार मिळवण्यासाठी नोकरी पोस्ट करा."],
  hero_reached: ["{onSite} of {total} have reached the site.", "{total} में से {onSite} साइट पर पहुंच गए हैं।", "{total} पैकी {onSite} साइटवर पोहोचले आहेत."],
  applications: ["Applications", "आवेदन", "अर्ज"],
  postNewJob: ["Post New Job", "नई नौकरी पोस्ट करें", "नवीन नोकरी पोस्ट करा"],

  // ── KPI cards ───────────────────────────────────────────────────────────
  kpi_onSite: ["{n} on site", "{n} साइट पर", "{n} साइटवर"],
  kpi_activeWorkers: ["Active Workers Today", "आज के सक्रिय कामगार", "आजचे सक्रिय कामगार"],
  kpi_stillOnWay: ["{n} still on the way", "{n} अभी रास्ते में हैं", "{n} अजून वाटेत आहेत"],
  kpi_noWorkers: ["No workers active yet", "अभी कोई कामगार सक्रिय नहीं", "अजून कोणताही कामगार सक्रिय नाही"],
  kpi_closed: ["{n} closed", "{n} बंद", "{n} बंद"],
  kpi_activeJobs: ["Active Jobs", "सक्रिय नौकरियां", "सक्रिय नोकऱ्या"],
  kpi_postedTotal: ["{n} posted in total", "कुल {n} पोस्ट की गईं", "एकूण {n} पोस्ट केल्या"],
  kpi_viewAll: ["View All", "सभी देखें", "सर्व पहा"],
  kpi_applicants: ["Applicants", "आवेदक", "अर्जदार"],
  kpi_totalApplicants: ["Total Applicants", "कुल आवेदक", "एकूण अर्जदार"],
  kpi_acrossJobs: ["Across all your jobs", "आपकी सभी नौकरियों में", "तुमच्या सर्व नोकऱ्यांमध्ये"],
  kpi_review: ["Review", "देखें", "तपासा"],
  kpi_today: ["Today", "आज", "आज"],
  kpi_jobsCompleted: ["Jobs Completed", "पूरी हुई नौकरियां", "पूर्ण झालेल्या नोकऱ्या"],
  kpi_rateWorkers: ["Rate your workers", "अपने कामगारों को रेटिंग दें", "तुमच्या कामगारांना रेटिंग द्या"],
  kpi_noneFinished: ["None finished yet", "अभी कोई पूरी नहीं हुई", "अजून कोणतीही पूर्ण झाली नाही"],

  // ── Quick request ───────────────────────────────────────────────────────
  quick_1: ["1-Click Quick", "1-क्लिक में", "1-क्लिकमध्ये"],
  quick_2: ["Worker Request!", "कामगार की मांग!", "कामगार मागणी!"],
  customSpec: ["Custom Job Spec", "अपनी नौकरी का विवरण", "स्वतःचे नोकरी तपशील"],
  trade_Driver: ["Driver", "ड्राइवर", "ड्रायव्हर"],
  trade_Electrician: ["Electrician", "इलेक्ट्रीशियन", "इलेक्ट्रिशियन"],
  trade_Plumber: ["Plumber", "प्लंबर", "प्लंबर"],
  trade_Cook: ["Cook", "रसोइया", "स्वयंपाकी"],
  trade_Carpenter: ["Carpenter", "बढ़ई", "सुतार"],
  trade_Painter: ["Painter", "पेंटर", "रंगारी"],

  // ── Job list ────────────────────────────────────────────────────────────
  yourJobs: ["Your Job Postings", "आपकी पोस्ट की गई नौकरियां", "तुमच्या पोस्ट केलेल्या नोकऱ्या"],
  activeCount: ["{n} Active", "{n} सक्रिय", "{n} सक्रिय"],
  filter_all: ["Filter: All ({n})", "फ़िल्टर: सभी ({n})", "फिल्टर: सर्व ({n})"],
  filter_active: ["Filter: Active ({n})", "फ़िल्टर: सक्रिय ({n})", "फिल्टर: सक्रिय ({n})"],
  filter_closed: ["Filter: Closed ({n})", "फ़िल्टर: बंद ({n})", "फिल्टर: बंद ({n})"],
  noJobs: ["No jobs posted yet", "अभी तक कोई नौकरी पोस्ट नहीं की गई", "अजून कोणतीही नोकरी पोस्ट केलेली नाही"],
  noJobsSub: ["Post your first job and workers can apply right away.", "अपनी पहली नौकरी पोस्ट करें, कामगार तुरंत आवेदन कर सकते हैं।", "तुमची पहिली नोकरी पोस्ट करा, कामगार लगेच अर्ज करू शकतात."],
  postFirst: ["Post your first job", "अपनी पहली नौकरी पोस्ट करें", "तुमची पहिली नोकरी पोस्ट करा"],
  noMatch: ["No jobs match your search or filter.", "आपकी खोज या फ़िल्टर से कोई नौकरी नहीं मिली।", "तुमच्या शोध किंवा फिल्टरशी जुळणारी नोकरी नाही."],
  tag_active: ["● Active", "● सक्रिय", "● सक्रिय"],
  tag_closed: ["Closed", "बंद", "बंद"],
  tag_urgent: ["Urgent", "अत्यावश्यक", "तातडीचे"],
  pay_Cash: ["Cash", "नकद", "रोख"],
  pay_UPI: ["UPI", "UPI", "UPI"],
  dailyWage: ["Daily Wage", "दैनिक मजदूरी", "दैनिक मजुरी"],
  perWorker: ["/worker", "/कामगार", "/कामगार"],
  applicants_1: ["{n} applicant", "{n} आवेदक", "{n} अर्जदार"],
  applicants_n: ["{n} applicants", "{n} आवेदक", "{n} अर्जदार"],
  viewApplicants: ["View Applicants", "आवेदक देखें", "अर्जदार पहा"],
  moreHands: ["Need more hands for tomorrow or weekend shifts?", "कल या वीकेंड की शिफ्ट के लिए और कामगार चाहिए?", "उद्या किंवा वीकेंडच्या शिफ्टसाठी आणखी कामगार हवेत?"],
  moreHandsSub: ["Post a new job and workers can apply right away.", "नई नौकरी पोस्ट करें, कामगार तुरंत आवेदन कर सकते हैं।", "नवीन नोकरी पोस्ट करा, कामगार लगेच अर्ज करू शकतात."],
  postAJob: ["+ Post a Job", "+ नौकरी पोस्ट करें", "+ नोकरी पोस्ट करा"],

  // ── Live roll call & activity ───────────────────────────────────────────
  liveRollCall: ["Live Roll Call", "लाइव हाज़िरी", "लाइव्ह हजेरी"],
  nActive: ["{n} active", "{n} सक्रिय", "{n} सक्रिय"],
  rollEmpty: ["When a worker accepts one of your jobs they appear here with live status and location.", "जब कोई कामगार आपकी नौकरी स्वीकार करता है, तो वह लाइव स्थिति और स्थान के साथ यहां दिखता है।", "जेव्हा एखादा कामगार तुमची नोकरी स्वीकारतो, तेव्हा तो लाइव्ह स्थिती आणि स्थानासह येथे दिसतो."],
  liveGps: ["Live GPS", "लाइव GPS", "लाइव्ह GPS"],
  noGps: ["No GPS", "GPS नहीं", "GPS नाही"],
  track: ["Track →", "ट्रैक करें →", "ट्रॅक करा →"],
  recentActivity: ["Recent Activity", "हाल की गतिविधि", "अलीकडील क्रियाकलाप"],
  activityEmpty: ["Updates appear here when a worker accepts, sets off, arrives or finishes a job.", "जब कोई कामगार नौकरी स्वीकार करता है, निकलता है, पहुंचता है या पूरी करता है तो अपडेट यहां दिखते हैं।", "जेव्हा कामगार नोकरी स्वीकारतो, निघतो, पोहोचतो किंवा पूर्ण करतो तेव्हा अपडेट येथे दिसतात."],
  dismiss: ["Dismiss", "हटाएं", "काढा"],
  worker: ["Worker", "कामगार", "कामगार"],

  // ── Job status ──────────────────────────────────────────────────────────
  st_accepted: ["Worker Accepted Job", "कामगार ने नौकरी स्वीकार की", "कामगाराने नोकरी स्वीकारली"],
  st_on_the_way: ["Worker On the Way", "कामगार रास्ते में है", "कामगार वाटेत आहे"],
  st_arrived: ["Worker Arrived", "कामगार पहुंच गया", "कामगार पोहोचला"],
  st_completed: ["Job Completed", "नौकरी पूरी हुई", "नोकरी पूर्ण झाली"],
  stShort_accepted: ["Accepted", "स्वीकार किया", "स्वीकारले"],
  stShort_on_the_way: ["On the Way", "रास्ते में", "वाटेत"],
  stShort_arrived: ["Arrived", "पहुंचा", "पोहोचला"],
  stShort_completed: ["Completed", "पूरी हुई", "पूर्ण"],
  notify_accepted: ["A worker accepted your job!", "एक कामगार ने आपकी नौकरी स्वीकार की!", "एका कामगाराने तुमची नोकरी स्वीकारली!"],
  notify_on_the_way: ["Worker is on the way to you!", "कामगार आपके पास आ रहा है!", "कामगार तुमच्याकडे येत आहे!"],
  notify_arrived: ["Worker has arrived!", "कामगार पहुंच गया है!", "कामगार पोहोचला आहे!"],
  notify_completed: ["Job done! Please rate the worker.", "काम पूरा हुआ! कृपया कामगार को रेटिंग दें।", "काम पूर्ण झाले! कृपया कामगाराला रेटिंग द्या."],

  // ── Rating modal & tracking modal ───────────────────────────────────────
  rateTheWorker: ["Rate the Worker", "कामगार को रेटिंग दें", "कामगाराला रेटिंग द्या"],
  reviewPlaceholder: ["Write a review (optional)", "समीक्षा लिखें (वैकल्पिक)", "समीक्षा लिहा (ऐच्छिक)"],
  skip: ["Skip", "छोड़ें", "वगळा"],
  submitRating: ["Submit Rating", "रेटिंग जमा करें", "रेटिंग सबमिट करा"],
  saving: ["Saving…", "सहेजा जा रहा है…", "जतन करत आहे…"],
  failedSave: ["Failed to save", "सहेजने में विफल", "जतन करण्यात अयशस्वी"],
  liveWorkerLocation: ["Live Worker Location", "कामगार का लाइव स्थान", "कामगाराचे लाइव्ह स्थान"],
  close: ["Close", "बंद करें", "बंद करा"],
  kmAway: ["{n} km away", "{n} किमी दूर", "{n} किमी दूर"],
  yourLocation: ["Your Location", "आपका स्थान", "तुमचे स्थान"],
  noLocation: ["No location data", "स्थान की जानकारी नहीं", "स्थान माहिती नाही"],
  rateWorkerBtn: ["Rate Worker", "कामगार को रेटिंग दें", "कामगाराला रेटिंग द्या"],

  // ── Applications page: tabs, badges, scores ─────────────────────────────
  tab_all: ["All Applications", "सभी आवेदन", "सर्व अर्ज"],
  tab_awaiting: ["Awaiting Call / Review", "कॉल / समीक्षा की प्रतीक्षा", "कॉल / तपासणीच्या प्रतीक्षेत"],
  tab_confirmed: ["Confirmed for Today", "आज के लिए पक्का", "आजसाठी निश्चित"],
  tab_completed: ["Completed & Ready to Rate", "पूरे हुए, रेटिंग के लिए तैयार", "पूर्ण, रेटिंगसाठी तयार"],
  tab_rated: ["Rated", "रेटिंग दी गई", "रेटिंग दिले"],
  badge_awaiting: ["Under Review", "समीक्षा में", "तपासणीत"],
  badge_confirmed: ["Confirmed", "पक्का", "निश्चित"],
  badge_completed: ["Ready to Rate", "रेटिंग के लिए तैयार", "रेटिंगसाठी तयार"],
  badge_rated: ["Rated", "रेटिंग दी गई", "रेटिंग दिले"],
  score_5: ["5.0 - Excellent & Highly Recommended", "5.0 - उत्कृष्ट और अत्यधिक अनुशंसित", "5.0 - उत्कृष्ट आणि अत्यंत शिफारसीय"],
  score_4: ["4.0 - Very Good", "4.0 - बहुत अच्छा", "4.0 - खूप छान"],
  score_3: ["3.0 - Good", "3.0 - अच्छा", "3.0 - चांगले"],
  score_2: ["2.0 - Fair", "2.0 - ठीक-ठाक", "2.0 - बरे"],
  score_1: ["1.0 - Poor", "1.0 - खराब", "1.0 - वाईट"],
  unit_hour: ["hr", "घंटा", "तास"],
  unit_day: ["day", "दिन", "दिवस"],
  unit_week: ["week", "सप्ताह", "आठवडा"],
  unit_month: ["month", "महीना", "महिना"],

  // ── Applications page: header area ──────────────────────────────────────
  crumb_home: ["Home", "होम", "मुख्यपृष्ठ"],
  listingNo: ["Listing #{id}", "लिस्टिंग #{id}", "लिस्टिंग #{id}"],
  livePill_1: ["Live: {n} worker on the way / on site", "लाइव: {n} कामगार रास्ते में / साइट पर", "लाइव्ह: {n} कामगार वाटेत / साइटवर"],
  livePill_n: ["Live: {n} workers on the way / on site", "लाइव: {n} कामगार रास्ते में / साइट पर", "लाइव्ह: {n} कामगार वाटेत / साइटवर"],
  site: ["Site:", "साइट:", "साइट:"],
  pageTitle: ["Applications & Candidate Review", "आवेदन और उम्मीदवार समीक्षा", "अर्ज आणि उमेदवार तपासणी"],
  totalN: ["{n} Total", "कुल {n}", "एकूण {n}"],
  pageSub: ["Review daily-wage applicants, verify credentials, conduct phone verification, and record official performance ratings.", "दैनिक मजदूरी आवेदकों की समीक्षा करें, दस्तावेज़ सत्यापित करें, फ़ोन पर पुष्टि करें और आधिकारिक प्रदर्शन रेटिंग दर्ज करें।", "दैनिक मजुरी अर्जदारांची तपासणी करा, कागदपत्रे पडताळा, फोनवर खात्री करा आणि अधिकृत कामगिरी रेटिंग नोंदवा."],
  exportLog: ["Export Applications Log", "आवेदन लॉग निर्यात करें", "अर्ज लॉग एक्सपोर्ट करा"],
  postReplacement: ["Post a Replacement Job", "वैकल्पिक नौकरी पोस्ट करें", "पर्यायी नोकरी पोस्ट करा"],

  // ── Applications page: filters & list ───────────────────────────────────
  searchPh: ["Search by name, phone or skill", "नाम, फ़ोन या कौशल से खोजें", "नाव, फोन किंवा कौशल्याने शोधा"],
  role_all: ["Role: All jobs", "भूमिका: सभी नौकरियां", "भूमिका: सर्व नोकऱ्या"],
  role_x: ["Role: {title}", "भूमिका: {title}", "भूमिका: {title}"],
  untitled: ["Untitled job", "बिना शीर्षक की नौकरी", "शीर्षक नसलेली नोकरी"],
  dist_any: ["Distance: Any", "दूरी: कोई भी", "अंतर: कोणतेही"],
  dist_n: ["Distance: Within {n} km radius", "दूरी: {n} किमी के दायरे में", "अंतर: {n} किमी परिघात"],
  sortBy: ["Sort by:", "क्रमबद्ध करें:", "क्रमवारी:"],
  sort_rating: ["Top Rated & Verified First", "सर्वश्रेष्ठ रेटिंग और सत्यापित पहले", "सर्वोच्च रेटिंग आणि पडताळलेले आधी"],
  sort_newest: ["Newest First", "नवीनतम पहले", "नवीनतम आधी"],
  sort_wage: ["Highest Wage First", "सबसे ज़्यादा मजदूरी पहले", "सर्वाधिक मजुरी आधी"],
  loading: ["Loading applications…", "आवेदन लोड हो रहे हैं…", "अर्ज लोड होत आहेत…"],
  emptyNone: ["No applications yet. Workers who apply to your jobs will appear here.", "अभी कोई आवेदन नहीं। आपकी नौकरियों के लिए आवेदन करने वाले कामगार यहां दिखेंगे।", "अजून कोणताही अर्ज नाही. तुमच्या नोकऱ्यांसाठी अर्ज करणारे कामगार येथे दिसतील."],
  emptyFilter: ["No applicants match these filters.", "इन फ़िल्टर से कोई आवेदक नहीं मिला।", "या फिल्टरशी जुळणारा अर्जदार नाही."],
  applicantsN: ["APPLICANTS ({n})", "आवेदक ({n})", "अर्जदार ({n})"],
  sorted_rating: ["Sorted by rating", "रेटिंग के अनुसार", "रेटिंगनुसार"],
  sorted_newest: ["Sorted by date", "तारीख के अनुसार", "तारखेनुसार"],
  sorted_wage: ["Sorted by wage", "मजदूरी के अनुसार", "मजुरीनुसार"],
  isNew: ["New", "नया", "नवीन"],
  shiftsN: ["({n} shifts)", "({n} शिफ्ट)", "({n} शिफ्ट)"],
  shiftCompleted: ["Shift completed", "शिफ्ट पूरी हुई", "शिफ्ट पूर्ण झाली"],

  // ── Applications page: detail panel ─────────────────────────────────────
  appliedToday: ["Applied today, {time}", "आज आवेदन किया, {time}", "आज अर्ज केला, {time}"],
  appliedOn: ["Applied {date}, {time}", "{date} को आवेदन किया, {time}", "{date} रोजी अर्ज केला, {time}"],
  appNo: ["Application #APP-{code}", "आवेदन #APP-{code}", "अर्ज #APP-{code}"],
  verified: ["Verified", "सत्यापित", "पडताळलेले"],
  appliedFor: ["Applied for:", "इसके लिए आवेदन:", "यासाठी अर्ज:"],
  workerContact: ["Worker Contact", "कामगार का संपर्क", "कामगाराचा संपर्क"],
  notProvided: ["Not provided", "उपलब्ध नहीं", "उपलब्ध नाही"],
  callNow: ["Call Now", "अभी कॉल करें", "आता कॉल करा"],
  whatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  agreedWage: ["Agreed Wage", "तय मजदूरी", "ठरलेली मजुरी"],
  shiftHours: ["Shift Hours", "शिफ्ट के घंटे", "शिफ्टचे तास"],
  payoutStatus: ["Payout Status", "भुगतान की स्थिति", "पेमेंट स्थिती"],
  payout_rated: ["Rated", "रेटिंग दी गई", "रेटिंग दिले"],
  payout_ready: ["Ready to Pay", "भुगतान के लिए तैयार", "पेमेंटसाठी तयार"],
  payout_pending: ["Pending shift", "शिफ्ट बाकी", "शिफ्ट बाकी"],
  yourRating: ["Your rating", "आपकी रेटिंग", "तुमची रेटिंग"],
  rateClose: ["Rate Worker & Close Shift", "कामगार को रेटिंग दें और शिफ्ट बंद करें", "कामगाराला रेटिंग द्या आणि शिफ्ट बंद करा"],
  rateSub: ["Submit shift feedback to complete this application.", "इस आवेदन को पूरा करने के लिए शिफ्ट की प्रतिक्रिया दें।", "हा अर्ज पूर्ण करण्यासाठी शिफ्टचा अभिप्राय द्या."],
  shiftCompletedChip: ["Shift Completed", "शिफ्ट पूरी हुई", "शिफ्ट पूर्ण झाली"],
  perfScore: ["Performance Score", "प्रदर्शन स्कोर", "कामगिरी गुण"],
  managerNotes: ["Site Manager Notes", "साइट मैनेजर के नोट्स", "साइट मॅनेजरच्या नोंदी"],
  notesPlaceholder: ["How did {name} perform on this shift?", "इस शिफ्ट में {name} का प्रदर्शन कैसा रहा?", "या शिफ्टमध्ये {name} ची कामगिरी कशी होती?"],
  preferred: ["Add {name} to my preferred workers for tomorrow", "{name} को कल के लिए मेरे पसंदीदा कामगारों में जोड़ें", "{name} यांना उद्यासाठी माझ्या आवडत्या कामगारांमध्ये जोडा"],
  submitting: ["Submitting…", "जमा हो रहा है…", "सबमिट होत आहे…"],
  saveDraft: ["Save as Draft", "ड्राफ्ट के रूप में सहेजें", "ड्राफ्ट म्हणून जतन करा"],
  draftSaved: ["Draft saved", "ड्राफ्ट सहेजा गया", "ड्राफ्ट जतन केला"],
  failedRating: ["Failed to submit rating", "रेटिंग जमा करने में विफल", "रेटिंग सबमिट करण्यात अयशस्वी"],
  shiftStaffing: ["SHIFT STAFFING", "शिफ्ट स्टाफिंग", "शिफ्ट स्टाफिंग"],
  confirmedOf: ["{a} of {b} Confirmed", "{b} में से {a} पक्के", "{b} पैकी {a} निश्चित"],
  wageSummary: ["WAGE SUMMARY", "मजदूरी सारांश", "मजुरी सारांश"],
  payVia: ["Pay via {m}", "{m} से भुगतान", "{m} द्वारे पेमेंट"],
  totalWages: ["Total wages for this listing's crew", "इस लिस्टिंग के कामगारों की कुल मजदूरी", "या लिस्टिंगच्या कामगारांची एकूण मजुरी"],
  // ── Workers page ────────────────────────────────────────────────────────
  ws_title: ["Workers", "कामगार", "कामगार"],
  ws_sub: ["Everyone who has created a work profile on HireMate. New workers show up here automatically.", "HireMate पर वर्क प्रोफ़ाइल बनाने वाले सभी कामगार। नए कामगार यहां अपने आप दिखते हैं।", "HireMate वर वर्क प्रोफाइल बनवलेले सर्व कामगार. नवीन कामगार येथे आपोआप दिसतात."],
  ws_total: ["Total Workers", "कुल कामगार", "एकूण कामगार"],
  ws_newWeek: ["Joined this week", "इस हफ़्ते जुड़े", "या आठवड्यात जोडले गेले"],
  ws_available: ["Available", "उपलब्ध", "उपलब्ध"],
  ws_busy: ["On a job now", "अभी काम पर", "सध्या कामावर"],
  ws_searchPh: ["Search by name, skill, phone or area", "नाम, कौशल, फ़ोन या इलाके से खोजें", "नाव, कौशल्य, फोन किंवा परिसराने शोधा"],
  ws_allSkills: ["All skills", "सभी कौशल", "सर्व कौशल्ये"],
  ws_sort_newest: ["Newest first", "नए पहले", "नवीन आधी"],
  ws_sort_rating: ["Top rated first", "सबसे अच्छी रेटिंग पहले", "सर्वोच्च रेटिंग आधी"],
  ws_sort_name: ["Name A–Z", "नाम A–Z", "नाव A–Z"],
  ws_showing: ["Showing {a} of {b} workers", "{b} में से {a} कामगार दिख रहे हैं", "{b} पैकी {a} कामगार दिसत आहेत"],
  ws_newBanner_1: ["{n} new worker just joined", "{n} नया कामगार अभी जुड़ा", "{n} नवीन कामगार नुकताच जोडला गेला"],
  ws_newBanner_n: ["{n} new workers just joined", "{n} नए कामगार अभी जुड़े", "{n} नवीन कामगार नुकतेच जोडले गेले"],
  ws_dismiss: ["Got it", "ठीक है", "ठीक आहे"],
  ws_badgeNew: ["New", "नया", "नवीन"],
  ws_joinedToday: ["Joined today", "आज जुड़े", "आज जोडले गेले"],
  ws_joinedOn: ["Joined {date}", "{date} को जुड़े", "{date} रोजी जोडले गेले"],
  ws_noSkills: ["No skills added", "कोई कौशल नहीं जोड़ा", "कौशल्य जोडलेले नाही"],
  ws_noLocation: ["Location not added", "स्थान नहीं जोड़ा", "स्थान जोडलेले नाही"],
  ws_none: ["No workers have created a profile yet.", "अभी तक किसी कामगार ने प्रोफ़ाइल नहीं बनाई।", "अजून कोणत्याही कामगाराने प्रोफाइल बनवलेली नाही."],
  ws_noMatch: ["No workers match your search.", "आपकी खोज से कोई कामगार नहीं मिला।", "तुमच्या शोधाशी जुळणारा कामगार नाही."],
  ws_loading: ["Loading workers…", "कामगार लोड हो रहे हैं…", "कामगार लोड होत आहेत…"],
  ws_failed: ["Could not load workers. Please try again.", "कामगार लोड नहीं हो सके। कृपया फिर कोशिश करें।", "कामगार लोड होऊ शकले नाहीत. कृपया पुन्हा प्रयत्न करा."],
  ws_retry: ["Try again", "फिर कोशिश करें", "पुन्हा प्रयत्न करा"],
} as const satisfies Record<string, Entry>;

export type EmployerKey = keyof typeof TEXT;
type Vars = Record<string, string | number>;

const INDEX: Record<Language, 0 | 1 | 2> = { en: 0, hi: 1, mr: 2 };
const LOCALE: Record<Language, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

function translate(language: Language, key: EmployerKey, vars?: Vars): string {
  const entry: Entry | undefined = TEXT[key];
  if (!entry) return String(key);
  const text = entry[INDEX[language]] || entry[0];
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text;
}

/** **bold** markers become <b> elements. */
function renderRich(text: string): ReactNode {
  return text.split("**").map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>));
}

export function useEmployerT() {
  const { language } = useLanguage();

  const tr = useCallback((key: EmployerKey, vars?: Vars) => translate(language, key, vars), [language]);
  /** Picks `<base>_1` when n is 1, otherwise `<base>_n`; {n} is filled in automatically. */
  const trp = useCallback(
    (base: string, n: number, vars?: Vars) => translate(language, `${base}_${n === 1 ? "1" : "n"}` as EmployerKey, { n, ...vars }),
    [language]
  );
  const rich = useCallback((key: EmployerKey, vars?: Vars) => renderRich(translate(language, key, vars)), [language]);
  /** Picks the shown language out of a { en, hi, mr } value saved with a job. */
  const loc = useCallback(
    (value?: { en: string } & Partial<Record<Language, string>> | string): string =>
      !value ? "" : typeof value === "string" ? value : value[language] || value.en || "",
    [language]
  );

  return { tr, trp, rich, loc, language, locale: LOCALE[language] };
}