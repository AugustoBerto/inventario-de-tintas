import { Router } from "express";
import type { DataSource } from "typeorm";
import { z } from "zod";
import { InventoryAccess } from "../database/entities/InventoryAccess.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, loadInventoryAccess } from "../middleware/inventory-access.js";

const createSchema = z.object({
  corporateUserId: z.union([z.string(), z.number()]).transform(String),
  registration: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined ? undefined : String(value)),
  displayName: z.string().trim().min(1).max(180),
  profile: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
});
const updateSchema = z.object({
  profile: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
});

export const createAccessUsersRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(InventoryAccess);
  router.use(authenticate, loadInventoryAccess(dataSource), authorize("ADMIN"));

  router.get("/", async (req, res, next) => {
    try {
      const registration =
        typeof req.query.registration === "string" ? req.query.registration : "";
      res.json(
        await repository
          .createQueryBuilder("access")
          .where(
            registration ? "access.registration ILIKE :registration" : "1 = 1",
            { registration: `%${registration}%` },
          )
          .orderBy("access.displayName", "ASC")
          .getMany(),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Informe os dados corporativos e o perfil." });
      return;
    }
    try {
      res.status(201).json(
        await repository.save(repository.create({ ...parsed.data, active: true })),
      );
    } catch {
      res.status(409).json({ message: "Este colaborador já possui acesso." });
    }
  });

  router.patch("/:id", async (req, res, next) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Alteração inválida." });
      return;
    }
    try {
      const access = await repository.findOneBy({ id: String(req.params.id) });
      if (!access) {
        res.status(404).json({ message: "Acesso não encontrado." });
        return;
      }
      repository.merge(access, parsed.data);
      res.json(await repository.save(access));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
