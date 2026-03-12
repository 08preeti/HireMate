const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const API = {
  get: async (path) => {
    const res = await fetch(`${BASE}${path}`);
    return res.json();
  },
  post: async (path, body) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

export default API;
