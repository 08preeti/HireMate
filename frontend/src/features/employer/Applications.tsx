"use client";

import React, { useEffect, useState, useCallback } from "react";
import { translations } from "@/i18n/translations";
import { useLanguage } from "@/context/LanguageContext";
import { getEmployerApplications, rateApplication } from "@/services/applications";
import type { Translations } from "@/i18n/translations";
import type { Application, Language } from "@/types";

interface ApplicationRowProps {
  a: Application;
  language: Language;
  t: Translations;
  onRated: () => void;
}


// ✅ FIXED: Extracted into its own component so each row has its own state
// Previously: rating was set by directly mutating a.tempRating — not React state
function ApplicationRow({ a, language, t, onRated }: ApplicationRowProps) {
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRating = async () => {
    if (!rating) return alert("Please select a rating");
    setSubmitting(true);
    try {
      await rateApplication(a._id, { rating: Number(rating), review });
      onRated(); // refresh parent
    } catch (err) {
      console.error(err);
      alert("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-bold text-lg">{a.applicantName}</h3>

      <p className="text-sm text-gray-600">
        {t.appliedFor}: {a.job?.jobTitle?.[language]}
      </p>

      <p className="mt-2">
        📞 {t.contact}: {a.applicantContact}
      </p>

      {a.message && (
        <p className="mt-2 text-gray-600">{a.message}</p>
      )}

      {/* Rate Worker */}
      {!a.isCompleted && (
        <div className="mt-4 border-t pt-3">
          <p className="font-semibold mb-2">Rate Worker</p>

          {/* ✅ FIXED: now uses local useState — previously used a.tempRating mutation */}
          <select
            className="border p-2 rounded mr-2"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="">Select Rating</option>
            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
            <option value="4">⭐⭐⭐⭐ (4)</option>
            <option value="3">⭐⭐⭐ (3)</option>
            <option value="2">⭐⭐ (2)</option>
            <option value="1">⭐ (1)</option>
          </select>

          <input
            type="text"
            placeholder="Write review"
            className="border p-2 rounded mr-2"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />

          <button
            className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={submitRating}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Submit"}
          </button>
        </div>
      )}

      {/* Show completed rating */}
      {a.isCompleted && (
        <div className="mt-3">
          <p>⭐ Rating: {a.rating}/5</p>
          <p className="text-gray-600">{a.review}</p>
        </div>
      )}
    </div>
  );
}

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const { language } = useLanguage();
  const t = translations[language];

  // Role guard + 401 handling live in the (employer) layout and the API client.
  const fetchApps = useCallback(() => {
    getEmployerApplications()
      .then((data) => setApps(data.applications || []))
      .catch((err: unknown) => console.error(err));
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6 text-[#006491]">
        {t.applications}
      </h1>

      {apps.length === 0 && (
        <p className="text-gray-600">{t.noApplications}</p>
      )}

      <div className="grid gap-4">
        {apps.map((a) => (
          <ApplicationRow
            key={a._id}
            a={a}
            language={language}
            t={t}
           
            onRated={fetchApps}
          />
        ))}
      </div>
    </div>
  );
}