import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WorkerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    skills: "",
    location: "",
    contact: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/workers/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      // ✅ Save worker locally (auto-login style)
      localStorage.setItem("worker", JSON.stringify(data));

      alert("Worker registered successfully ✅");
      navigate("/jobs");
    } catch (err) {
      alert("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Worker Registration
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Your Name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="skills"
            placeholder="Your Skill (e.g. Gardener, Plumber)"
            value={form.skills}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="location"
            placeholder="Your Location"
            value={form.location}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="contact"
            placeholder="Phone Number"
            required
            value={form.contact}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
