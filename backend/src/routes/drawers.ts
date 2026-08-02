import { Router } from "express";
import type { DataSource } from "typeorm";
import { z } from "zod";
import { Drawer } from "../database/entities/Drawer.js";
import { InventorySetting } from "../database/entities/InventorySetting.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, loadInventoryAccess } from "../middleware/inventory-access.js";
import { drawerSummary } from "../services/addressing.js";

const updateDrawerSchema = z.object({
  capacity: z.number().int().min(1),
});

export const createDrawersRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(Drawer);
  router.use(authenticate, loadInventoryAccess(dataSource));

  router.get("/", async (_req, res, next) => {
    try {
      const drawers = await repository.find({
        order: { type: "DESC", number: "ASC" },
      });
      res.json(
        await Promise.all(
          drawers.map((drawer) => drawerSummary(dataSource.manager, drawer)),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const drawer = await repository.findOneBy({ id: String(req.params.id) });
      if (!drawer) {
        res.status(404).json({ message: "Gaveta não encontrada." });
        return;
      }
      const summary = await drawerSummary(dataSource.manager, drawer);
      const samples = await dataSource.getRepository("Sample").find({
        where: { drawerId: drawer.id },
        order: { reference: "ASC" },
      });
      res.json({ ...summary, samples });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", authorize("ADMIN", "OPERATOR"), async (req, res, next) => {
    const parsed = updateDrawerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Capacidade inválida." });
      return;
    }

    try {
      const drawer = await repository.findOneBy({ id: String(req.params.id) });
      if (!drawer) {
        res.status(404).json({ message: "Gaveta não encontrada." });
        return;
      }

      const maxSetting = await dataSource
        .getRepository(InventorySetting)
        .findOneBy({ key: "maxDrawerCapacity" });
      const maxCapacity = Number(maxSetting?.value ?? 100);

      if (parsed.data.capacity > maxCapacity) {
        res.status(400).json({
          message: `A capacidade não pode exceder a capacidade máxima configurada (${maxCapacity}).`,
        });
        return;
      }

      const summary = await drawerSummary(dataSource.manager, drawer);
      if (parsed.data.capacity < summary.occupied) {
        res.status(400).json({
          message: `A capacidade (${parsed.data.capacity}) não pode ser menor que o número de amostras atualmente armazenadas (${summary.occupied}).`,
        });
        return;
      }

      drawer.capacity = parsed.data.capacity;
      await repository.save(drawer);

      res.json(await drawerSummary(dataSource.manager, drawer));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
