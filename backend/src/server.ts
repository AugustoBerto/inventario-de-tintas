import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { appDataSource } from "./database/data-source.js";

const start = async () => {
  await appDataSource.initialize();
  const app = createApp(appDataSource);
  const server = app.listen(env.port, env.host, () => {
    logger.info({ host: env.host, port: env.port }, "inventory_api_started");
  });

  const shutdown = () => {
    server.close(async () => {
      await appDataSource.destroy();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((error) => {
  logger.fatal({ err: error }, "inventory_api_start_failed");
  process.exit(1);
});
