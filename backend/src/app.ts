import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import type { DataSource } from "typeorm";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createDrawersRouter } from "./routes/drawers.js";
import { createAccessUsersRouter } from "./routes/access-users.js";
import { createHealthRouter } from "./routes/health.js";
import { createSamplesRouter } from "./routes/samples.js";
import { createSessionRouter } from "./routes/session.js";
import { createSettingsRouter } from "./routes/settings.js";

export const createApp = (dataSource: DataSource) => {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(cookieParser());
  app.use(express.json());
  app.use("/health", createHealthRouter(dataSource));
  app.use("/session", createSessionRouter(dataSource));
  app.use("/samples", createSamplesRouter(dataSource));
  app.use("/drawers", createDrawersRouter(dataSource));
  app.use("/settings", createSettingsRouter(dataSource));
  app.use("/access-users", createAccessUsersRouter(dataSource));
  app.use((_req, res) =>
    res.status(404).json({ message: "Rota não encontrada." }),
  );
  app.use(errorHandler);

  return app;
};
