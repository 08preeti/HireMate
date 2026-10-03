// ✅ Single place to change the API URL — set REACT_APP_API_URL in .env for production
const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// auth can be: false | true (employer, kept for backwards compatibility) | "worker"
function buildHeaders(auth) {
  const headers = { "Content-Type": "application/json" };
  if (auth === "worker") {
    const token = localStorage.getItem("workerToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } else if (auth) {
    const token = localStorage.getItem("employerToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

const API = {
  get: async (path, auth = false) => {
    const res = await fetch(`${BASE}${path}`, { headers: buildHeaders(auth) });
    return res.json();
  },

  post: async (path, body, auth = false) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: buildHeaders(auth),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  put: async (path, body, auth = false) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: buildHeaders(auth),
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

export default API;
export { BASE };
