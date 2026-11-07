import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";
import { startLocationCleanup } from "./src/services/locationService.js";

connectDB()
  .then(() => {
    startLocationCleanup();
    app.listen(env.port, () => console.log(`🚀 Server running on http://localhost:${env.port}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });
