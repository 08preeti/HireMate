  import express from "express";
  import cors from "cors";
  import { env } from "./config/env.js";
  import routes from "./routes/index.js";
  import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { securityHeaders } from "./middleware/securityHeaders.js";

  const app = express();

  // Behind Render's proxy: without this every visitor shares the proxy's IP and the rate limiters block everyone together.
  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "100kb" }));

  // Health check (the frontend pings this to wake the server)
  app.get("/", (req, res) => {
    res.send("HireMate Backend Running 🚀");
  });

  app.use("/api", apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  export default app;
