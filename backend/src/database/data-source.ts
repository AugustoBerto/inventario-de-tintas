import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Drawer } from "./entities/Drawer.js";
import { InventorySetting } from "./entities/InventorySetting.js";
import { Sample } from "./entities/Sample.js";
import { CreateInventorySettings1722283200000 } from "./migrations/1722283200000-CreateInventorySettings.js";
import { CreateSamples1722286800000 } from "./migrations/1722286800000-CreateSamples.js";
import { CreateDrawersAndAddressing1722290400000 } from "./migrations/1722290400000-CreateDrawersAndAddressing.js";

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
  entities: [InventorySetting, Sample, Drawer],
  migrations: [
    CreateInventorySettings1722283200000,
    CreateSamples1722286800000,
    CreateDrawersAndAddressing1722290400000,
  ],
});
