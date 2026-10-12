"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LOGIN } from "@/config/routes";
import { ApiError } from "@/services/api";
import { getJob, reportJob } from "@/services/jobs";
import { applyToJob } from "@/services/applications";
import type { Job } from "@/types";


export default function JobDetails() {
  const { id }           = useParams<{ id: string }>();
  const { language }     = useLanguage();
  const t                = translations[language];
  const router           = useRouter();
  const { worker }       = useAuth();

  const [job, setJob]               = useState<Job | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showApply, setShowApply]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm]             = useState({ name: "", contact: "", message: "" });
  const [reportForm, setReportForm] = useState({ reason: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting]   = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    getJob(id)
      .then(data => { setJob(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!job) return;
    if (!form.name || !form.contact) return alert("Name and phone required");
    setSubmitting(true);
    try {
      await applyToJob(job._id, { applicantName: form.name, applicantContact: form.contact, message: form.message });
      toast(t.appliedSuccess, "success");
      setShowApply(false);
      setAppliedSuccess(true);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error submitting application", "error");
    }
    setSubmitting(false);
  };

  const handleReport = async () => {
    if (!job) return;
    if (!reportForm.reason) return alert("Please select a reason");
    setReporting(true);
    try {
      await reportJob(job._id, { reason: reportForm.reason, reporterPhone: reportForm.phone });
      setReportDone(true);
      setTimeout(() => { setShowReport(false); setReportDone(false); }, 2000);
    } catch { alert("Could not submit report"); }
    setReporting(false);
  };

  if (loading) return <div className="p-10 text-center">{t.loading}</div>;
  if (!job)    return <div className="p-10 text-center">{t.jobNotFound}</div>;

  const REPORT_REASONS = {
    en: ["Fake job / fraud", "Wrong salary shown", "Employer not responding", "Job already filled", "Inappropriate content"],
    hi: ["फर्जी नौकरी / धोखा", "गलत वेतन दिखाया", "नियोक्ता जवाब नहीं दे रहा", "नौकरी पहले ही भर गई", "अनुचित सामग्री"],
    mr: ["बनावट नोकरी / फसवणूक", "चुकीचा पगार दाखवला", "नियोक्ता प्रतिसाद देत नाही", "नोकरी आधीच भरली", "अयोग्य सामग्री"],
  };
  const reasons = REPORT_REASONS[language] || REPORT_REASONS.en;

  return (
    <div className="max-w-[700px] my-0 mx-auto py-7 px-4 font-plain">
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,.09)] p-7">

        {/* Header */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-b-[#f0f0f0]">
          <div>
            {job.isUrgent && (
              <span className="bg-danger text-white rounded-md py-[3px] px-2.5 text-[12px] font-bold inline-block mb-2">
                🚨 {t.urgent}
              </span>
            )}
            <h1 className="text-[24px] font-extrabold text-brand mt-0 mx-0 mb-1.5">
              {job.jobTitle?.[language]}
            </h1>
            <p className="text-gray-500 text-[14px] m-0">📍 {job.location?.[language]}</p>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-extrabold text-danger">₹{job.salary}</div>
            {job.paymentMethod && (
              <div className="text-[12px] text-[#888888] mt-0.5">{job.paymentMethod}</div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2.5 mb-6">
          {job.skills?.[language] && <p className="m-0 text-[14px]"><b>{t.skills}:</b> {job.skills[language]}</p>}
          {job.description?.[language] && <p className="m-0 text-[14px]"><b>{t.description}:</b> {job.description[language]}</p>}
          {job.contactInfo && <p className="m-0 text-[14px]"><b>{t.contact}:</b> {job.contactInfo}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 mb-4">
          <button
            onClick={() => {
              // Applying is a worker action: visitors sign in as a worker first.
              if (!worker) { router.push(ROLE_LOGIN.worker); return; }
              setForm((f) => ({ ...f, name: f.name || worker.name, contact: f.contact || worker.phone || "" }));
              setShowApply(true);
            }}
            className="flex-[2] py-[13px] px-0 bg-danger text-white rounded-[10px] font-bold text-[15px] cursor-pointer"
          >{t.applyNow}</button>

          {job.contactInfo && (
            <a href={`tel:${job.contactInfo}`}
              className="flex-1 py-[13px] px-0 bg-emerald-500 text-white rounded-[10px] font-bold text-[15px] no-underline text-center"
            >📞 {t.call}</a>
          )}
        </div>

        {/* Report button */}
        <button
          onClick={() => {
            if (!worker) { router.push(ROLE_LOGIN.worker); return; }
            setShowReport(true);
          }}
          className="w-full py-2.5 px-0 bg-transparent border border-gray-200 rounded-[10px] text-gray-400 text-[13px] cursor-pointer flex items-center justify-center gap-1.5"
        >
          🚩 {language === "hi" ? "इस नौकरी की शिकायत करें" : language === "mr" ? "ही नोकरी रिपोर्ट करा" : "Report this job"}
        </button>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.45)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px]">
            <h3 className="mt-0 mx-0 mb-4 text-[17px] font-bold">{t.applyNow}: {job.jobTitle?.[language]}</h3>
            <input placeholder={t.yourName} value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-2.5 box-border" />
            <input placeholder={t.phoneNumber} value={form.contact} onChange={e => setForm({...form, contact: e.target.value})}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-2.5 box-border" />
            <textarea placeholder={t.message} rows={3} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-3.5 box-border resize-none" />
            <div className="flex gap-2.5">
              <button onClick={() => setShowApply(false)} className="flex-1 py-[11px] px-0 bg-gray-100 rounded-[10px] font-semibold cursor-pointer">{t.cancel}</button>
              <button onClick={handleApply} disabled={submitting} className="flex-[2] py-[11px] px-0 bg-danger text-white rounded-[10px] font-bold cursor-pointer">{submitting ? "..." : t.apply}</button>
            </div>
          </div>
        </div>
      )}

      {/* Applied Success Screen */}
      {appliedSuccess && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.5)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-[20px] p-8 w-full max-w-[380px] text-center">
            <div className="text-[64px] mb-4">🎉</div>
            <div className="text-[22px] font-extrabold text-emerald-500 mb-2">
              {language === "hi" ? "आवेदन भेज दिया!" : language === "mr" ? "अर्ज पाठवला!" : "Application Sent!"}
            </div>
            <div className="text-[14px] text-gray-500 mb-2 leading-[1.6]">
              {language === "hi" ? `${job.companyName || "नियोक्ता"} को आपका आवेदन मिल गया है।` : language === "mr" ? `${job.companyName || "नियोक्ता"} ला तुमचा अर्ज मिळाला आहे.` : `Your application has been sent to ${job.companyName || "the employer"}.`}
            </div>
            <div className="text-[13px] text-brand font-semibold mb-6 bg-brand-light rounded-[10px] py-2.5 px-3.5">
              📞 {language === "hi" ? "नियोक्ता जल्द कॉल करेगा" : language === "mr" ? "नियोक्ता लवकरच कॉल करेल" : "The employer will call you soon"}
            </div>
            <button onClick={() => setAppliedSuccess(false)}
              className="w-full py-[13px] px-0 bg-brand text-white rounded-xl font-bold text-[16px] cursor-pointer">
              {language === "hi" ? "ठीक है 👍" : language === "mr" ? "ठीक आहे 👍" : "Got it 👍"}
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.45)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px]">
            {reportDone ? (
              <div className="text-center py-5 px-0">
                <div className="text-[48px] mb-3">✅</div>
                <div className="font-bold text-[16px]">
                  {language === "hi" ? "रिपोर्ट दर्ज हुई!" : language === "mr" ? "तक्रार नोंदवली!" : "Report submitted!"}
                </div>
                <div className="text-[13px] text-gray-500 mt-1.5">
                  {language === "hi" ? "हम इसकी जांच करेंगे।" : language === "mr" ? "आम्ही तपासणी करू." : "We will review this job."}
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-0 mx-0 mb-1.5 text-[17px] font-bold">
                  🚩 {language === "hi" ? "नौकरी की शिकायत" : language === "mr" ? "नोकरी रिपोर्ट" : "Report Job"}
                </h3>
                <p className="text-[13px] text-gray-500 mt-0 mx-0 mb-4">
                  {language === "hi" ? "समस्या का कारण चुनें:" : language === "mr" ? "समस्येचे कारण निवडा:" : "Select the reason:"}
                </p>

                {reasons.map((r, i) => (
                  <button key={i} onClick={() => setReportForm({...reportForm, reason: r})}
                    className={`w-full py-2.5 px-3.5 rounded-[10px] text-[14px] cursor-pointer text-left mb-2 border-[1.5px] ${reportForm.reason === r ? "bg-red-100 border-danger text-danger font-semibold" : "bg-gray-50 border-gray-200 text-gray-700 font-normal"}`}>
                    {reportForm.reason === r ? "● " : "○ "}{r}
                  </button>
                ))}

                <input
                  placeholder={language === "hi" ? "आपका फ़ोन नंबर (वैकल्पिक)" : language === "mr" ? "तुमचा फोन नंबर (पर्यायी)" : "Your phone number (optional)"}
                  value={reportForm.phone}
                  onChange={e => setReportForm({...reportForm, phone: e.target.value})}
                  className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-3.5 box-border"
                />

                <div className="flex gap-2.5">
                  <button onClick={() => setShowReport(false)} className="flex-1 py-[11px] px-0 bg-gray-100 rounded-[10px] font-semibold cursor-pointer">{t.cancel}</button>
                  <button onClick={handleReport} disabled={reporting || !reportForm.reason}
                    className={`flex-[2] py-[11px] px-0 text-white rounded-[10px] font-bold ${reportForm.reason ? "bg-danger cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}>
                    {reporting ? "..." : (language === "hi" ? "शिकायत करें" : language === "mr" ? "तक्रार करा" : "Submit Report")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}