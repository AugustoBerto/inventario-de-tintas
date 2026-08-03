import { Router } from "express";
import type { DataSource } from "typeorm";
import { z } from "zod";
import { InventorySetting } from "../database/entities/InventorySetting.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  authorize,
  loadInventoryAccess,
} from "../middleware/inventory-access.js";

const settingsSchema = z.object({
  maxDrawerCapacity: z.number().int().min(1).max(10000),
  capacityAlertPercent: z.number().int().min(1).max(100),
  expirationAlertDays: z.number().int().min(0).max(3650),
});

const readSettings = async (dataSource: DataSource) => {
  const rows = await dataSource
    .getRepository(InventorySetting)
    .findBy([
      { key: "maxDrawerCapacity" },
      { key: "capacityAlertPercent" },
      { key: "expirationAlertDays" },
    ]);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    maxDrawerCapacity: Number(values.maxDrawerCapacity ?? 100),
    capacityAlertPercent: Number(values.capacityAlertPercent ?? 80),
    expirationAlertDays: Number(values.expirationAlertDays ?? 30),
  };
};

export const createSettingsRouter = (dataSource: DataSource) => {
  const router = Router();
  router.use(authenticate, loadInventoryAccess(dataSource));

  router.get("/", async (_req, res, next) => {
    try {
      res.json(await readSettings(dataSource));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", authorize("ADMIN"), async (req, res, next) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Configurações inválidas." });
      return;
    }
    try {
      await dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(InventorySetting);
        for (const [key, value] of Object.entries(parsed.data)) {
          await repository.save(repository.create({ key, value }));
        }
      });
      res.json(parsed.data);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
