import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { InventorySetting } from "./entities/InventorySetting.js";
import { CreateInventorySettings1722283200000 } from "./migrations/1722283200000-CreateInventorySettings.js";

export const appDataSource = new DataSource({
  type: "postgres",
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [InventorySetting],
  migrations: [CreateInventorySettings1722283200000],
});
