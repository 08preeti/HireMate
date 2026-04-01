import axios from "axios";

// ✅ Backend API base URL — update if your backend runs on a different port
const API_BASE_URL = "http://localhost:5000/api";

// 🧠 Worker Registration
export const registerWorker = async (workerData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/workers`, workerData);
    return res.data;
  } catch (err) {
    console.error("❌ Error registering worker:", err.response?.data || err.message);
    throw err;
  }
};

// 🏢 Employer Job Posting
export const postJob = async (jobData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/jobs`, jobData);
    return res.data;
  } catch (err) {
    console.error("❌ Error posting job:", err.response?.data || err.message);
    throw err;
  }
};

// 💼 Get All Jobs
export const getJobs = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/jobs`);
    return res.data;
  } catch (err) {
    console.error("❌ Error fetching jobs:", err.response?.data || err.message);
    throw err;
  }
};

// 🤖 Get AI Suggestions
export const getAISuggestions = async (data) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/ai/suggestions`, data);
    return res.data;
  } catch (err) {
    console.error("❌ Error fetching AI suggestions:", err.response?.data || err.message);
    throw err;
  }
};