import React, { useState } from "react";
import axios from "axios";
import "../App.css";

function JobMatch() {
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const res = await axios.post("http://localhost:5000/api/ai/match", {
        skills,
        location,
      });
      setResult(res.data.message);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setResult("❌ Error generating matches.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Find AI-Recommended Jobs</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your skills"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Enter your location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Finding..." : "Find Jobs"}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <h3>AI Suggestions:</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default JobMatch;
