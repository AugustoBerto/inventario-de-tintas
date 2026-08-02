import { QueryFailedError } from "typeorm";
import type { EntityManager } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  isUniqueViolation,
  removesLastActiveAdmin,
  updateAccessUser,
} from "../src/routes/access-users.js";

const activeAdmin = { profile: "ADMIN" as const, active: true };

describe("regras de acesso ao inventário", () => {
  it("classifica somente a violação PostgreSQL 23505 como duplicidade", () => {
    expect(
      isUniqueViolation(
        new QueryFailedError(
          "INSERT",
          [],
          Object.assign(new Error(), { code: "23505" }),
        ),
      ),
    ).toBe(true);
    expect(
      isUniqueViolation(
        new QueryFailedError(
          "INSERT",
          [],
          Object.assign(new Error(), { code: "08006" }),
        ),
      ),
    ).toBe(false);
    expect(isUniqueViolation(new Error("Auth Service indisponível"))).toBe(
      false,
    );
  });

  it("bloqueia rebaixamento ou desativação do último administrador ativo", () => {
    expect(
      removesLastActiveAdmin(activeAdmin, { profile: "OPERATOR" }, 1),
    ).toBe(true);
    expect(removesLastActiveAdmin(activeAdmin, { active: false }, 1)).toBe(
      true,
    );
  });

  it("permite alteração quando outro administrador ativo permanece", () => {
    expect(removesLastActiveAdmin(activeAdmin, { profile: "VIEWER" }, 2)).toBe(
      false,
    );
    expect(removesLastActiveAdmin(activeAdmin, { active: false }, 2)).toBe(
      false,
    );
  });

  it("serializa e bloqueia a persistência do último administrador", async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue({ id: "admin-1", ...activeAdmin }),
      countBy: vi.fn().mockResolvedValue(1),
      merge: vi.fn(),
      save: vi.fn(),
    };
    const manager = {
      query: vi.fn().mockResolvedValue(undefined),
      getRepository: vi.fn().mockReturnValue(repository),
    } as unknown as EntityManager;

    await expect(
      updateAccessUser(manager, "admin-1", { active: false }),
    ).resolves.toEqual({ kind: "last-admin" });
    expect(manager.query).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      ["inventory_access_active_admins"],
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
