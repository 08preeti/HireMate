  import express from "express";
  import cors from "cors";
  import { env } from "./config/env.js";
  import routes from "./routes/index.js";
  import { notFound, errorHandler } from "./middleware/errorHandler.js";

  const app = express();

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json());

  // Health check (the frontend pings this to wake the server)
  app.get("/", (req, res) => {
    res.send("HireMate Backend Running 🚀");
  });

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  export default app;
