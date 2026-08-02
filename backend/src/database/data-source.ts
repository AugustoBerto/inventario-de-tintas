import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Drawer } from "./entities/Drawer.js";
import { InventoryAccess } from "./entities/InventoryAccess.js";
import { InventorySetting } from "./entities/InventorySetting.js";
import { Sample } from "./entities/Sample.js";
import { SampleMovement } from "./entities/SampleMovement.js";
import { InitialAmostrasTintas1785542400000 } from "./migrations/1785542400000-InitialAmostrasTintas.js";
import { INVENTORY_SCHEMA } from "./schema.js";

export const appDataSource = new DataSource({
  type: "postgres",
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
  schema: INVENTORY_SCHEMA,
  synchronize: false,
  logging: false,
  migrationsTableName: "migrations",
  entities: [InventorySetting, Sample, Drawer, InventoryAccess, SampleMovement],
  migrations: [InitialAmostrasTintas1785542400000],
});
