"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { getMyJobs } from "@/services/workers";
import type { Application } from "@/types";


export default function MyJobs() {
  const [jobs, setJobs]   = useState<Application[]>([]);
  const { language }      = useLanguage();
  const t                 = translations[language];
  const { worker }        = useAuth();
  const phone             = worker?.phone;

  useEffect(() => {
    if (!phone) return;
    getMyJobs(phone)
      .then((data) => setJobs(data))
      .catch(() => {});
  }, [phone]);

  if (jobs.length === 0) return (
    <div className="p-10 text-center text-gray-500 text-[16px]">
      {t.noJobsApplied}
    </div>
  );

  return (
    <div className="max-w-[600px] my-0 mx-auto py-7 px-4 font-plain">
      <h2 className="font-extrabold text-[22px] mb-5 text-brand">
        {t.myJobs}
      </h2>

      {jobs.map((j) => (
        <div key={j._id} className="bg-white p-[18px] rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,.08)] mb-3 border border-[#f0f0f0]">
          <h3 className="mt-0 mx-0 mb-1.5 font-bold text-[16px]">
            {j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}
          </h3>
          <p className="my-1 mx-0 text-gray-500 text-[14px]">
            📍 {j.job?.location?.[language] || j.job?.location?.en}
          </p>
          <p className="my-1 mx-0 font-bold text-danger text-[14px]">
            ₹{j.job?.salary}
          </p>
          <hr className="my-2.5 mx-0 border-t border-t-[#f0f0f0]" />
          <p className="m-0 text-[13px] text-gray-700">
            {t.statusLabel}: {j.isCompleted ? t.completed : t.applied}
          </p>
          {j.isCompleted && j.rating && (
            <p className="my-1 mx-0 text-[13px] text-amber-500">
              ⭐ {j.rating}/5
            </p>
          )}
        </div>
      ))}
    </div>
  );
}