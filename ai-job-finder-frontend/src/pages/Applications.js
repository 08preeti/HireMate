import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


import { translations } from "../translations";
import { useLanguage } from "../context/LanguageContext";


export default function Applications() {
  const [apps, setApps] = useState([]);
  const navigate = useNavigate();

  const { language } = useLanguage();
  const t = translations[language];



  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return navigate("/employer-login");

  axios.get("http://localhost:5000/api/applications/employer", {
  headers: { Authorization: `Bearer ${token}` },
})
.then((res) => {
  console.log("API RESPONSE:", res.data);
  setApps(res.data.applications);
});



}, [navigate]);


return (
  <div className="max-w-6xl mx-auto px-6 py-12">
    <h1 className="text-3xl font-bold mb-6 text-[#006491]">
      {t.applications}
    </h1>

    {apps.length === 0 && (
      <p className="text-gray-600">
        {t.noApplications}
      </p>
    )}

    <div className="grid gap-4">
      {apps.map((a) => (
        <div
          key={a._id}
          className="bg-white p-6 rounded-lg shadow"
        >
          <h3 className="font-bold text-lg">
            {a.applicantName}
          </h3>

          <p className="text-sm text-gray-600">
            {t.appliedFor}: {a.job?.jobTitle?.[language]}
          </p>

          <p className="mt-2">
            📞 {t.contact}: {a.applicantContact}
          </p>

          {/* Message */}
          {a.message && (
            <p className="mt-2 text-gray-600">
              {a.message}
            </p>
          )}

          {/* ⭐ Rating Section */}

          {!a.isCompleted && (
            <div className="mt-4 border-t pt-3">

              <p className="font-semibold mb-2">
                Rate Worker
              </p>

              <select
                className="border p-2 rounded mr-2"
                onChange={(e)=> a.tempRating = e.target.value}
              >
                <option>Rating</option>
                <option value="5">⭐⭐⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="2">⭐⭐</option>
                <option value="1">⭐</option>
              </select>

              <input
                type="text"
                placeholder="Write review"
                className="border p-2 rounded mr-2"
                onChange={(e)=> a.tempReview = e.target.value}
              />

              <button
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={()=>{
                  axios.post(
                    `http://localhost:5000/api/applications/rate/${a._id}`,
                    {
                      rating: a.tempRating,
                      review: a.tempReview
                    },
                    {
                      headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                      }
                    }
                  ).then(()=>{
                    window.location.reload()
                  })
                }}
              >
                Submit
              </button>

            </div>
          )}

          {/* ⭐ Show Rating */}

          {a.isCompleted && (
            <div className="mt-3">

              <p>
                ⭐ Rating: {a.rating}/5
              </p>

              <p className="text-gray-600">
                {a.review}
              </p>

            </div>
          )}

        </div>
      ))}
    </div>
  </div>
);
}
  