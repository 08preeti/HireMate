/*const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

export default API;  */


//----------------
// ✅ Single place to change the API URL — set REACT_APP_API_URL in .env for production
const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const API = {
  get: async (path, auth = false) => {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = localStorage.getItem("employerToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}${path}`, { headers });
    return res.json();
  },

  post: async (path, body, auth = false) => {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = localStorage.getItem("employerToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return res.json();
  },

  put: async (path, body, auth = false) => {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = localStorage.getItem("employerToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

export default API;
export { BASE };
