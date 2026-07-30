import { Router } from "express";
import type { DataSource } from "typeorm";
import { authenticate } from "../middleware/authenticate.js";
import { loadInventoryAccess } from "../middleware/inventory-access.js";

export const createSessionRouter = (dataSource: DataSource) => {
  const router = Router();
  router.get("/", authenticate, loadInventoryAccess(dataSource), (req, res) => {
    res.json({ user: req.authUser, access: req.inventoryAccess });
  });
  return router;
};
