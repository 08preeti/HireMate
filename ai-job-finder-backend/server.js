/*import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import employerAuthRoutes from "./routes/employerAuthRoutes.js";
import employerDashboardRoutes from "./routes/employerDashboardRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.use("/api/employer", employerAuthRoutes);
app.use("/api/employer/dashboard", employerDashboardRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/workers", workerRoutes);

app.get("/", (req, res) => {
  res.send("HireMate Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
); */


//-----------------------
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import employerAuthRoutes from "./routes/employerAuthRoutes.js";
import employerDashboardRoutes from "./routes/employerDashboardRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.use("/api/employer", employerAuthRoutes);
app.use("/api/employer/dashboard", employerDashboardRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.send("HireMate Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);