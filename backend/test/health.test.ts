import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createApp } from "../src/app.js";

const dataSource = {
  query: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
} as unknown as DataSource;

describe("health", () => {
  it("retorna o estado da API", async () => {
    const response = await request(createApp(dataSource)).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      service: "dass-inventory-api",
      status: "ok",
    });
  });

  it("valida a conexão com o banco", async () => {
    const response = await request(createApp(dataSource)).get(
      "/health/database",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
  });
});

