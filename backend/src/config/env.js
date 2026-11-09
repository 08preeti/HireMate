import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Copy .env.example to .env and fill them in.");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

// FRONTEND_URL may be a comma-separated list of allowed browser origins.
const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean)
  : [];

if (isProduction && !frontendUrls.length) {
  console.error("❌ FRONTEND_URL is required in production (the deployed frontend origin, e.g. https://your-app.vercel.app).");
  process.exit(1);
}
if (isProduction && process.env.JWT_SECRET.length < 32) {
  console.warn("⚠️ JWT_SECRET is shorter than 32 characters. Use a long random value in production.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: frontendUrls.length ? frontendUrls : ["http://localhost:3000"],
  trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : isProduction ? 1 : 0,
  maps: {
    nominatimUrl: (process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, ""),
    photonUrl: (process.env.PHOTON_URL || "https://photon.komoot.io").replace(/\/$/, ""),
    osrmUrl: (process.env.OSRM_URL || "https://router.project-osrm.org").replace(/\/$/, ""),
    contactEmail: process.env.MAP_CONTACT_EMAIL || "",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
};
