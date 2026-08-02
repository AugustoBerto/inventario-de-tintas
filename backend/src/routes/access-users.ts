import { Router } from "express";
import { QueryFailedError } from "typeorm";
import type { DataSource, EntityManager } from "typeorm";
import { z } from "zod";
import {
  InventoryAccess,
  type InventoryProfile,
} from "../database/entities/InventoryAccess.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  authorize,
  loadInventoryAccess,
} from "../middleware/inventory-access.js";

const createSchema = z.object({
  registration: z.union([z.string(), z.number()]).transform(String),
  profile: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
});
const updateSchema = z.object({
  profile: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
});

type AccessUpdate = {
  profile?: InventoryProfile;
  active?: boolean;
};

export const isUniqueViolation = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === "23505";

export const removesLastActiveAdmin = (
  access: Pick<InventoryAccess, "profile" | "active">,
  changes: AccessUpdate,
  activeAdminCount: number,
) => {
  const removesAdminRole =
    changes.profile !== undefined && changes.profile !== "ADMIN";
  return (
    access.profile === "ADMIN" &&
    access.active &&
    (removesAdminRole || changes.active === false) &&
    activeAdminCount <= 1
  );
};

export const updateAccessUser = async (
  manager: EntityManager,
  id: string,
  changes: AccessUpdate,
) => {
  await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "inventory_access_active_admins",
  ]);
  const repository = manager.getRepository(InventoryAccess);
  const access = await repository.findOne({
    where: { id },
    lock: { mode: "pessimistic_write" },
  });
  if (!access) return { kind: "not-found" as const };

  const activeAdminCount = await repository.countBy({
    profile: "ADMIN",
    active: true,
  });
  if (removesLastActiveAdmin(access, changes, activeAdminCount)) {
    return { kind: "last-admin" as const };
  }

  repository.merge(access, changes);
  return { kind: "ok" as const, access: await repository.save(access) };
};

interface CorporateLookup {
  employee: {
    nome: string;
    nome_setor?: string | null;
    funcao?: string | null;
  };
  isUserRegistered: boolean;
  userData?: { id?: string | number } | null;
}

const lookupCorporateUser = async (registration: string, unit: string) => {
  const url = new URL(
    `/user/${encodeURIComponent(registration)}`,
    env.authServiceUrl,
  );
  url.searchParams.set("unidade", unit);
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Auth Service respondeu ${response.status}`);
  return (await response.json()) as CorporateLookup;
};

export const createAccessUsersRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(InventoryAccess);
  router.use(authenticate, loadInventoryAccess(dataSource), authorize("ADMIN"));

  router.get("/", async (req, res, next) => {
    try {
      const registration =
        typeof req.query.registration === "string"
          ? req.query.registration
          : "";
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

  router.get("/lookup/:registration", async (req, res, next) => {
    const registration = String(req.params.registration);
    const unit =
      (typeof req.query.unit === "string" ? req.query.unit : undefined) ??
      req.authUser?.unidade;
    if (!unit) {
      res.status(400).json({
        message: "A unidade do administrador não está disponível no JWT.",
      });
      return;
    }
    try {
      const result = await lookupCorporateUser(registration, unit);
      if (!result) {
        res.status(404).json({ message: "Colaborador não encontrado." });
        return;
      }
      if (!result.isUserRegistered || !result.userData?.id) {
        res
          .status(404)
          .json({ message: "Usuário não cadastrado no Auth Service." });
        return;
      }
      res.json({
        registration,
        displayName: result.employee.nome,
        department: result.employee.nome_setor ?? null,
        function: result.employee.funcao ?? null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Informe os dados corporativos e o perfil." });
      return;
    }
    try {
      const unit = req.authUser?.unidade;
      if (!unit) {
        res.status(400).json({
          message: "A unidade do administrador não está disponível no JWT.",
        });
        return;
      }
      const corporate = await lookupCorporateUser(
        parsed.data.registration,
        unit,
      );
      if (!corporate) {
        res.status(404).json({ message: "Colaborador não encontrado." });
        return;
      }
      if (!corporate.isUserRegistered || !corporate.userData?.id) {
        res
          .status(404)
          .json({ message: "Usuário não cadastrado no Auth Service." });
        return;
      }
      res.status(201).json(
        await repository.save(
          repository.create({
            corporateUserId: String(corporate.userData.id),
            registration: parsed.data.registration,
            displayName: corporate.employee.nome,
            profile: parsed.data.profile,
            active: true,
          }),
        ),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ message: "Este colaborador já possui acesso." });
        return;
      }
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Alteração inválida." });
      return;
    }
    try {
      const result = await dataSource.transaction((manager) =>
        updateAccessUser(manager, String(req.params.id), parsed.data),
      );
      if (result.kind === "not-found") {
        res.status(404).json({ message: "Acesso não encontrado." });
        return;
      }
      if (result.kind === "last-admin") {
        res.status(409).json({
          message: "Não é possível remover o último administrador ativo.",
        });
        return;
      }
      res.json(result.access);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
