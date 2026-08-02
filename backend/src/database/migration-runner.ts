import "reflect-metadata";
import { Client } from "pg";
import { env } from "../config/env.js";
import { appDataSource } from "./data-source.js";
import { INVENTORY_SCHEMA } from "./schema.js";

type MigrationAction = "run" | "revert";

function getAction(): MigrationAction {
  const action = process.argv[2];

  if (action === "run" || action === "revert") {
    return action;
  }

  throw new Error("Uso: tsx src/database/migration-runner.ts <run|revert>");
}

async function ensureSchema(): Promise<void> {
  const client = new Client({
    host: env.database.host,
    port: env.database.port,
    user: env.database.username,
    password: env.database.password,
    database: env.database.database,
    ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
  });
  let connected = false;

  try {
    await client.connect();
    connected = true;
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${INVENTORY_SCHEMA}"`);
  } finally {
    if (connected) {
      await client.end();
    }
  }
}

async function main(): Promise<void> {
  const action = getAction();

  await ensureSchema();

  try {
    await appDataSource.initialize();

    if (action === "run") {
      await appDataSource.runMigrations({ transaction: "all" });
    } else {
      await appDataSource.undoLastMigration({ transaction: "all" });
    }
  } finally {
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
