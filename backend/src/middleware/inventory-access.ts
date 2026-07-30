import type { NextFunction, Request, Response } from "express";
import type { DataSource } from "typeorm";
import {
  InventoryAccess,
  type InventoryProfile,
} from "../database/entities/InventoryAccess.js";
import { env } from "../config/env.js";

export const loadInventoryAccess =
  (dataSource: DataSource) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ message: "Não autenticado." });
      return;
    }

    try {
      const repository = dataSource.getRepository(InventoryAccess);
      const corporateUserId = String(user.id);
      let access = await repository.findOneBy({ corporateUserId });
      if (!access && user.matricula) {
        access = await repository.findOneBy({
          registration: String(user.matricula),
        });
        if (access && access.corporateUserId.startsWith("registration:")) {
          access.corporateUserId = corporateUserId;
          access = await repository.save(access);
        }
      }

      if (
        !access &&
        env.initialAdminRegistration &&
        String(user.matricula ?? "") === env.initialAdminRegistration &&
        (await repository.count()) === 0
      ) {
        access = await repository.save(
          repository.create({
            corporateUserId,
            registration: user.matricula ? String(user.matricula) : null,
            displayName: user.nome,
            profile: "ADMIN",
            active: true,
          }),
        );
      }

      if (!access || !access.active) {
        res.status(403).json({ message: "Acesso ao inventário não autorizado." });
        return;
      }

      req.inventoryAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };

export const authorize =
  (...profiles: InventoryProfile[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.inventoryAccess || !profiles.includes(req.inventoryAccess.profile)) {
      res.status(403).json({ message: "Você não possui permissão para esta operação." });
      return;
    }
    next();
  };
