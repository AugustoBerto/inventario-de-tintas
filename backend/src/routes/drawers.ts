import { Router } from "express";
import type { DataSource } from "typeorm";
import { Drawer } from "../database/entities/Drawer.js";
import { authenticate } from "../middleware/authenticate.js";
import { loadInventoryAccess } from "../middleware/inventory-access.js";
import { drawerSummary } from "../services/addressing.js";

export const createDrawersRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(Drawer);
  router.use(authenticate, loadInventoryAccess(dataSource));

  router.get("/", async (_req, res, next) => {
    try {
      const drawers = await repository.find({ order: { type: "DESC", number: "ASC" } });
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

  return router;
};
