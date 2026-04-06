/*import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { translations } from "../translations";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const { language } = useLanguage();
  const t = translations[language];

  const handlePostJob = () => {
    if (token) {
      navigate("/post-job");
    } else {
      navigate("/employer-login");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      
      
      <div className="bg-white rounded-2xl p-10 shadow-lg grid md:grid-cols-2 gap-10 items-center">
        
        
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#006491] leading-tight">
            {t.heroTitle}
          </h1>

          <p className="mt-4 text-gray-600 max-w-xl">
            {t.heroSub}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={handlePostJob}
              className="bg-[#006491] text-white px-6 py-3 rounded-lg font-semibold shadow"
            >
              {t.postJob}
            </button>

            <Link
              to="/jobs"
              className="border border-[#006491] text-[#006491] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0F7FA]"
            >
              {t.viewJobs}
            </Link>

            <Link
              to="/ai-suggestions"
              className="bg-[#E8002A] text-white px-6 py-3 rounded-lg font-semibold"
            >
              {t.getAI}
            </Link>
          </div>
        </div>

        
        <div className="bg-[#F3FAFF] rounded-2xl p-6 shadow-inner">
          <h3 className="text-xl font-bold text-[#006491] mb-2">
            {t.trending}
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            {t.categories}
          </p>

          <div className="grid grid-cols-2 gap-4">

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "पेंटर" : language === "mr" ? "रंगारी" : "Painter"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "दिल्ली" : language === "mr" ? "दिल्ली" : "Delhi"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "ड्राइवर" : language === "mr" ? "चालक" : "Driver"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "पुणे" : language === "mr" ? "पुणे" : "Pune"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "प्लंबर" : language === "mr" ? "प्लंबर" : "Plumber"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "मुंबई" : language === "mr" ? "मुंबई" : "Mumbai"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "इलेक्ट्रीशियन" : language === "mr" ? "इलेक्ट्रीशियन" : "Electrician"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "नागपुर" : language === "mr" ? "नागपूर" : "Nagpur"}
              </div>
            </div>

          </div>

          <div className="mt-4 text-right">
            <Link
              to="/jobs"
              className="text-sm text-[#006491] font-semibold hover:underline"
            >
              {t.seeAll}
            </Link>
          </div>
        </div>
      </div>

      
      <div className="mt-12 grid md:grid-cols-3 gap-6">

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.employer}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.employerDesc}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.worker}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.workerDesc}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.aiTitle}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.aiDesc}
          </p>
        </div>

      </div>
    </div>
  );
}  */ 



//-----------------------------
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { translations } from "../translations";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const { language } = useLanguage();
  const t = translations[language];

  // Show onboarding to first-time visitors who are not logged in
  useEffect(() => {
    const onboardingDone = localStorage.getItem("onboardingDone");
    const worker = localStorage.getItem("worker");
    const employer = localStorage.getItem("employerToken");
    if (!onboardingDone && !worker && !employer) {
      navigate("/onboarding");
    }
  }, [navigate]);

  const handlePostJob = () => {
    if (token || localStorage.getItem("employerToken")) {
      navigate("/post-job");
    } else {
      navigate("/employer-login");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      
      {/* HERO SECTION */}
      <div className="bg-white rounded-2xl p-10 shadow-lg grid md:grid-cols-2 gap-10 items-center">
        
        {/* LEFT SIDE */}
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#006491] leading-tight">
            {t.heroTitle}
          </h1>

          <p className="mt-4 text-gray-600 max-w-xl">
            {t.heroSub}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={handlePostJob}
              className="bg-[#006491] text-white px-6 py-3 rounded-lg font-semibold shadow"
            >
              {t.postJob}
            </button>

            <Link
              to="/jobs"
              className="border border-[#006491] text-[#006491] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0F7FA]"
            >
              {t.viewJobs}
            </Link>

            <Link
              to="/ai-suggestions"
              className="bg-[#E8002A] text-white px-6 py-3 rounded-lg font-semibold"
            >
              {t.getAI}
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-[#F3FAFF] rounded-2xl p-6 shadow-inner">
          <h3 className="text-xl font-bold text-[#006491] mb-2">
            {t.trending}
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            {t.categories}
          </p>

          <div className="grid grid-cols-2 gap-4">

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "पेंटर" : language === "mr" ? "रंगारी" : "Painter"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "दिल्ली" : language === "mr" ? "दिल्ली" : "Delhi"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "ड्राइवर" : language === "mr" ? "चालक" : "Driver"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "पुणे" : language === "mr" ? "पुणे" : "Pune"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "प्लंबर" : language === "mr" ? "प्लंबर" : "Plumber"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "मुंबई" : language === "mr" ? "मुंबई" : "Mumbai"}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow text-sm">
              <div className="font-semibold">
                {language === "hi" ? "इलेक्ट्रीशियन" : language === "mr" ? "इलेक्ट्रीशियन" : "Electrician"}
              </div>
              <div className="text-gray-500 text-xs">
                {language === "hi" ? "नागपुर" : language === "mr" ? "नागपूर" : "Nagpur"}
              </div>
            </div>

          </div>

          <div className="mt-4 text-right">
            <Link
              to="/jobs"
              className="text-sm text-[#006491] font-semibold hover:underline"
            >
              {t.seeAll}
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM CARDS */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.employer}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.employerDesc}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.worker}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.workerDesc}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">
            {t.aiTitle}
          </h4>
          <p className="text-gray-600 text-sm">
            {t.aiDesc}
          </p>
        </div>

      </div>
    </div>
  );
}