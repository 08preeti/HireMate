import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { translations } from "../translations";
import { useLanguage } from "../context/LanguageContext";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ✅ FIXED: Extracted into its own component so each row has its own state
// Previously: rating was set by directly mutating a.tempRating — not React state
function ApplicationRow({ a, language, t, token, onRated }) {
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRating = async () => {
    if (!rating) return alert("Please select a rating");
    setSubmitting(true);
    try {
      await axios.post(
        `${BASE}/api/applications/rate/${a._id}`,
        { rating: Number(rating), review },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
  const [apps, setApps] = useState([]);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  // ✅ FIXED: was using "token" — now uses "employerToken" to match AuthContext & EmployerLogin
  const token = localStorage.getItem("employerToken");

  const fetchApps = useCallback(() => {
    if (!token) return navigate("/employer-login");

    axios
      .get(`${BASE}/api/applications/employer`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setApps(res.data.applications || []))
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) navigate("/employer-login");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            token={token}
            onRated={fetchApps}
          />
        ))}
      </div>
    </div>
  );
}