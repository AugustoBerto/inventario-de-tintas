import { Router } from "express";
import type { DataSource } from "typeorm";

export const createHealthRouter = (dataSource: DataSource) => {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      service: "dass-inventory-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/database", async (_req, res, next) => {
    try {
      await dataSource.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
