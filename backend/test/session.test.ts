import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

const dataSource = {} as DataSource;

describe("session", () => {
  it("carrega o usuário a partir do cookie JWT compartilhado", async () => {
    const token = jsonwebtoken.sign(
      {
        id: 1,
        usuario: "TESTE",
        matricula: "12345",
        nome: "Usuário de Teste",
      },
      env.jwtSecret,
      { expiresIn: "5m" },
    );

    const response = await request(createApp(dataSource))
      .get("/session")
      .set("Cookie", [`token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      usuario: "TESTE",
      matricula: "12345",
      nome: "Usuário de Teste",
    });
  });

  it("rejeita acesso sem cookie", async () => {
    const response = await request(createApp(dataSource)).get("/session");

    expect(response.status).toBe(401);
  });
});

