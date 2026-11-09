import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";
import mongoose from "mongoose";
import { startLocationCleanup } from "./src/services/locationService.js";

connectDB()
  .then(() => {
    startLocationCleanup();
    const server = app.listen(env.port, () => console.log(`🚀 Server running on http://localhost:${env.port}`));

    // Render sends SIGTERM on every deploy: stop taking requests, then close the database.
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      server.close(() => mongoose.connection.close().finally(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });
