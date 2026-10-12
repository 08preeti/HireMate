"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { getJobs } from "@/services/jobs";
import type { Job, Language } from "@/types";


const getJobIcon = (title?: string): string => {
  if (!title) return "💼";
  const t = title.toLowerCase();
  if (t.includes("electric"))                    return "⚡";
  if (t.includes("driver") || t.includes("auto")) return "🚗";
  if (t.includes("plumb"))                       return "🔧";
  if (t.includes("clean") || t.includes("sweep")) return "🧹";
  if (t.includes("cook") || t.includes("chef"))  return "🍳";
  if (t.includes("security") || t.includes("guard")) return "🛡️";
  if (t.includes("helper") || t.includes("labour")) return "👷";
  if (t.includes("deliver"))                     return "📦";
  if (t.includes("paint"))                       return "🎨";
  if (t.includes("carpenter"))                   return "🪚";
  if (t.includes("maid") || t.includes("house")) return "🏠";
  if (t.includes("garden") || t.includes("mali")) return "🌿";
  if (t.includes("mason") || t.includes("construct")) return "🏗️";
  if (t.includes("mechanic"))                    return "⚙️";
  if (t.includes("waiter"))                      return "🍽️";
  if (t.includes("weld"))                        return "🔥";
  return "💼";
};

// Format salary with per-day/month label
function SalaryBadge({ salary, language }: { salary?: number | string; language: Language }) {
  if (!salary) return null;
  const s = Number(salary);
  let perLabel = "";
  if (s <= 2000) {
    perLabel = language === "hi" ? "/दिन" : language === "mr" ? "/दिवस" : "/day";
  } else if (s <= 20000) {
    perLabel = language === "hi" ? "/महीना" : language === "mr" ? "/महिना" : "/month";
  } else {
    perLabel = language === "hi" ? "/काम" : language === "mr" ? "/काम" : "/job";
  }
  return (
    <span className="font-extrabold text-[16px] text-danger">
      ₹{salary}<span className="text-[11px] font-medium text-[#888888]">{perLabel}</span>
    </span>
  );
}

// WhatsApp share
function shareOnWhatsApp(job: Job, language: Language): void {
  const title    = job.jobTitle?.[language] || job.jobTitle?.en || "Job";
  const location = job.location?.[language] || job.location?.en || "";
  const salary   = job.salary ? `₹${job.salary}` : "";
  const text     = `🔔 *${title}* नोकरी उपलब्ध!\n📍 ${location}\n💰 ${salary}\n\nHireMate वर पहा: https://hiremate-brown.vercel.app/jobs`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export default function Jobs() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [filterPayment, setFilterPayment] = useState("");
  const [filterMinSalary, setFilterMinSalary] = useState(0);
  const router                = useRouter();
  const { language }          = useLanguage();
  const t                     = translations[language];

  useEffect(() => {
    getJobs()
      .then((data) => { setJobs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((job) => {
    if (search) {
      const s = search.toLowerCase();
      const matches = (
        (job.jobTitle?.[language] || "").toLowerCase().includes(s) ||
        (job.location?.[language] || "").toLowerCase().includes(s) ||
        (job.skills?.[language]   || "").toLowerCase().includes(s)
      );
      if (!matches) return false;
    }
    if (filterUrgent && !job.isUrgent) return false;
    if (filterPayment && job.paymentMethod !== filterPayment) return false;
    if (filterMinSalary > 0 && Number(job.salary) < filterMinSalary) return false;
    return true;
  });

  if (loading) return (
    <div className="p-10 text-center text-[16px] text-gray-500">
      {t.loading}
    </div>
  );

  return (
    <div className="max-w-[1100px] my-0 mx-auto py-6 px-4 font-plain">

      {/* Header + Search */}
      <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
        <h2 className="text-[22px] font-extrabold text-brand m-0">
          {t.availableJobs}
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === "hi" ? "नौकरी खोजें…" : language === "mr" ? "नोकरी शोधा…" : "Search jobs…"}
          className="py-2.5 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] outline-none min-w-[200px]"
        />
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilterUrgent(v => !v)}
          className={`py-[7px] px-3.5 rounded-[20px] text-[13px] font-semibold cursor-pointer border-[1.5px] ${filterUrgent ? "border-danger bg-red-100 text-danger" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
          🚨 {language === "hi" ? "तत्काल" : language === "mr" ? "तातडीचे" : "Urgent"}
        </button>
        <button onClick={() => setFilterPayment(v => v === "Cash" ? "" : "Cash")}
          className={`py-[7px] px-3.5 rounded-[20px] text-[13px] font-semibold cursor-pointer border-[1.5px] ${filterPayment === "Cash" ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
          💵 {language === "hi" ? "नकद" : language === "mr" ? "रोख" : "Cash"}
        </button>
        <button onClick={() => setFilterMinSalary(v => v === 500 ? 0 : 500)}
          className={`py-[7px] px-3.5 rounded-[20px] text-[13px] font-semibold cursor-pointer border-[1.5px] ${filterMinSalary === 500 ? "border-brand bg-brand-light text-brand" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
          ₹500+
        </button>
        <button onClick={() => setFilterMinSalary(v => v === 1000 ? 0 : 1000)}
          className={`py-[7px] px-3.5 rounded-[20px] text-[13px] font-semibold cursor-pointer border-[1.5px] ${filterMinSalary === 1000 ? "border-brand bg-brand-light text-brand" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
          ₹1000+
        </button>
        {(filterUrgent || filterPayment || filterMinSalary > 0) && (
          <button onClick={() => { setFilterUrgent(false); setFilterPayment(""); setFilterMinSalary(0); }}
            className="py-[7px] px-3.5 rounded-[20px] text-[13px] font-semibold cursor-pointer border-[1.5px] border-gray-200 bg-gray-50 text-danger">
            ✕ {language === "hi" ? "हटाएं" : language === "mr" ? "काढा" : "Clear"}
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center p-10 text-gray-500">
          <div className="text-[48px] mb-3">🔍</div>
          <div className="font-semibold">{t.noJobs}</div>
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        {filtered.map((job) => (
          <div key={job._id} className="w-80 bg-white rounded-2xl shadow-[0_2px_14px_rgba(0,0,0,.09)] border border-[#f0f0f0] overflow-hidden flex flex-col">

            {/* Urgent banner */}
            {job.isUrgent && (
              <div className="bg-danger text-white py-[5px] px-3.5 text-[12px] font-bold">
                🚨 {t.urgent} — {language === "hi" ? "आज ही काम चाहिए" : language === "mr" ? "आजच कामगार हवा" : "Hiring Today"}
              </div>
            )}

            <div className="p-[18px] flex-1">
              {/* Title */}
              <h3 className="text-[17px] font-extrabold mt-0 mx-0 mb-1.5 text-[#111111]">
                {getJobIcon(job.jobTitle?.[language])} {job.jobTitle?.[language]}
              </h3>

              {/* Location */}
              <p className="text-gray-500 text-[13px] my-1 mx-0">
                📍 {job.location?.[language]}
              </p>

              {/* Skills */}
              <p className="text-[13px] my-1 mx-0 text-gray-700">
                🛠️ {job.skills?.[language]}
              </p>

              {/* Salary + Payment */}
              <div className="flex items-center gap-2.5 my-2.5 mx-0">
                <SalaryBadge salary={job.salary} language={language} />
                {job.paymentMethod && (
                  <span className={`rounded-[20px] py-0.5 px-2.5 text-[12px] font-semibold ${job.paymentMethod === "Cash" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-900"}`}>
                    {job.paymentMethod === "Cash" ? "💵" : job.paymentMethod === "UPI" ? "📱" : "🤝"} {job.paymentMethod}
                  </span>
                )}
              </div>

              {/* Rating */}
              {(job.rating ?? 0) > 0 && (
                <p className="text-[12px] my-1 mx-0 text-amber-500">
                  ⭐ {job.rating} ({job.totalReviews} {t.reviews})
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-0 px-[18px] pb-[18px] flex gap-2">
              {/* View details */}
              <button
                onClick={() => router.push(`/jobs/${job._id}`)}
                className="flex-[2] py-[11px] px-0 bg-brand text-white rounded-[10px] font-bold text-[14px] cursor-pointer"
              >
                {t.viewDetails}
              </button>

              {/* Call button */}
              {job.contactInfo && (
                <a
                  href={`tel:${job.contactInfo}`}
                  className="flex-1 py-[11px] px-0 bg-emerald-500 text-white rounded-[10px] font-bold text-[14px] no-underline text-center flex items-center justify-center"
                  title={language === "hi" ? "कॉल करें" : language === "mr" ? "कॉल करा" : "Call Employer"}
                >
                  📞
                </a>
              )}

              {/* WhatsApp share */}
              <button
                onClick={() => shareOnWhatsApp(job, language)}
                className="flex-1 py-[11px] px-0 bg-[#25d366] text-white rounded-[10px] font-bold text-[14px] cursor-pointer flex items-center justify-center"
                title={language === "hi" ? "WhatsApp पर शेयर करें" : language === "mr" ? "WhatsApp वर शेअर करा" : "Share on WhatsApp"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}