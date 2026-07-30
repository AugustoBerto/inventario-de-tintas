import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

const access = {
  id: "access-1",
  corporateUserId: "1",
  registration: "12345",
  displayName: "Usuário de Teste",
  profile: "ADMIN",
  active: true,
};

const createDataSource = (existingAccess: typeof access | null = access) => {
  const repository = {
    findOneBy: vi.fn().mockResolvedValue(existingAccess),
    count: vi.fn().mockResolvedValue(existingAccess ? 1 : 0),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: "access-1", ...value })),
  };
  return {
    getRepository: vi.fn().mockReturnValue(repository),
  } as unknown as DataSource;
};

describe("session", () => {
  it("carrega o usuário a partir do cookie JWT compartilhado", async () => {
    const token = jsonwebtoken.sign(
      {
        id: 1,
        usuario: "TESTE",
        matricula: "12345",
        nome: "Usuário de Teste",
        setor: null,
        funcao: null,
      },
      env.jwtSecret,
      { expiresIn: "5m" },
    );

    const response = await request(createApp(createDataSource()))
      .get("/session")
      .set("Cookie", [`token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      usuario: "TESTE",
      matricula: "12345",
      nome: "Usuário de Teste",
    });
    expect(response.body.access.profile).toBe("ADMIN");
  });

  it("rejeita acesso sem cookie", async () => {
    const response = await request(createApp(createDataSource())).get("/session");

    expect(response.status).toBe(401);
  });

  it("transforma o primeiro usuário válido em administrador inicial", async () => {
    const token = jsonwebtoken.sign(
      { id: 9, usuario: "ADMIN", nome: "Administrador Inicial" },
      env.jwtSecret,
      { expiresIn: "5m" },
    );
    const response = await request(createApp(createDataSource(null)))
      .get("/session")
      .set("Cookie", [`token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.access).toMatchObject({
      corporateUserId: "9",
      profile: "ADMIN",
      active: true,
    });
  });
});
