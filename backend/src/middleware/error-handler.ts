import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  logger.error({ error }, "request_failed");
  if (res.headersSent) return;
  res.status(500).json({ message: "Erro interno do servidor." });
};
