import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function JobDetails() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    message: "",
  });

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/jobs/${id}`)
      .then((res) => {
        setJob(res.data); // ✅ FIX
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (!job) return <div className="text-center mt-20">Job not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="bg-white rounded-xl shadow p-8">

        <div className="flex justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#006491]">
              {job.jobTitle?.en}
            </h1>
            <p className="text-gray-600">
              {job.companyName} • {job.location?.en}
            </p>
          </div>
          <div className="text-2xl font-bold text-[#E8002A]">
            ₹ {job.salary}
          </div>
        </div>

        <div className="space-y-3">
          <p><strong>Skills:</strong> {job.skills?.en}</p>
          {job.description && (
            <p><strong>Description:</strong> {job.description?.en}</p>
          )}
          <p><strong>Contact:</strong> {job.contactInfo}</p>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setShowApply(true)}
            className="bg-[#E8002A] text-white px-6 py-3 rounded font-semibold"
          >
            Apply Now
          </button>

          <a
            href={`tel:${job.contactInfo}`}
            className="bg-green-600 text-white px-6 py-3 rounded font-semibold"
          >
            Call
          </a>
        </div>
      </div>

      {/* APPLY MODAL */}
      {showApply && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Apply for {job.jobTitle?.en}
            </h3>

            <input
              placeholder="Your Name"
              className="w-full p-3 border rounded mb-3"
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              placeholder="Phone Number"
              className="w-full p-3 border rounded mb-3"
              onChange={(e) =>
                setForm({ ...form, contact: e.target.value })
              }
            />

            <textarea
              placeholder="Message"
              rows="3"
              className="w-full p-3 border rounded mb-4"
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApply(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await fetch(
                    `http://localhost:5000/api/applications/${job._id}/apply`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        applicantName: form.name,
                        applicantContact: form.contact,
                        message: form.message,
                      }),
                    }
                  );

                  alert("Applied successfully ✅");
                  alert("Application is sent 📩");
                  setShowApply(false);
                }}
                className="bg-[#E8002A] text-white px-4 py-2 rounded"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
