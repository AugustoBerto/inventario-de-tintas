import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config();

if (process.env.AUTH_ENV_FILE) {
  config({
    path: path.resolve(process.cwd(), process.env.AUTH_ENV_FILE),
    override: false,
  });
}

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("localhost"),
  PORT: z.coerce.number().int().positive().default(3050),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatório"),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().int().positive().optional(),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_SSL: booleanFromString,
  IP: z.string().optional(),
  PORT_AUTH_DATABASE: z.coerce.number().int().positive().optional(),
  USERS: z.string().optional(),
  PASS: z.string().optional(),
  DBASE: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Variáveis de ambiente inválidas: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

const values = parsed.data;

export const env = {
  nodeEnv: values.NODE_ENV,
  host: values.HOST,
  port: values.PORT,
  logLevel: values.LOG_LEVEL,
  corsOrigins: values.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  jwtSecret: values.JWT_SECRET,
  database: {
    host: values.DATABASE_HOST ?? values.IP ?? "localhost",
    port:
      values.DATABASE_PORT ??
      values.PORT_AUTH_DATABASE ??
      Number(process.env.PORT ?? 5432),
    username: values.DATABASE_USER ?? values.USERS ?? "postgres",
    password: values.DATABASE_PASSWORD ?? values.PASS ?? "",
    database: values.DATABASE_NAME ?? values.DBASE ?? "postgres",
    ssl: values.DATABASE_SSL,
  },
};

