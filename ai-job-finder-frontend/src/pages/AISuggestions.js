import React, { useState } from "react";

const AISuggestions = () => {
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async () => {
    if (!skills || !location) return alert("Please enter both skills and location");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, location }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error fetching AI suggestions");
      } else {
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      alert("AI server not responding");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-[#006491] mb-4">AI Job Suggestions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma separated)" className="p-3 border rounded-lg md:col-span-2" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="p-3 border rounded-lg" />
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={getSuggestions} className="bg-[#E8002A] text-white px-6 py-2 rounded-lg font-semibold">
            {loading ? "Searching..." : "Get Suggestions"}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {suggestions.length === 0 && <div className="text-gray-600">No suggestions yet — try skills + location above.</div>}
          {suggestions.map((s, idx) => (
            <div key={idx} className="bg-[#F0F7FA] p-4 rounded-lg border-l-4 border-[#006491]">
              <div className="font-semibold text-[#006491]">{s.skillMatch || s.title || "Recommendation"}</div>
              <div className="text-sm text-gray-700">{s.reason || s.description}</div>
              <div className="text-xs text-gray-500 mt-2">Location: {s.location}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISuggestions;
