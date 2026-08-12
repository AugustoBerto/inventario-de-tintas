import { config } from "dotenv";
import { z } from "zod";

config();

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("localhost"),
  PORT: z.coerce.number().int().positive().default(3050),
  LOG_LEVEL: z.string().default("info"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatório"),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:2400"),
  INVENTORY_INITIAL_ADMIN_REGISTRATION: z.string().trim().optional(),
  DATABASE_HOST: z.string().default("localhost"),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_USER: z.string().default("postgres"),
  DATABASE_PASSWORD: z.string().min(1, "DATABASE_PASSWORD é obrigatório"),
  DATABASE_NAME: z.string().default("postgres"),
  DATABASE_SSL: booleanFromString,
  CORS_ORIGIN: z.string().url().default("http://localhost"),
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
  jwtSecret: values.JWT_SECRET,
  authServiceUrl: values.AUTH_SERVICE_URL.replace(/\/$/, ""),
  initialAdminRegistration: values.INVENTORY_INITIAL_ADMIN_REGISTRATION,
  database: {
    host: values.DATABASE_HOST,
    port: values.DATABASE_PORT,
    username: values.DATABASE_USER,
    password: values.DATABASE_PASSWORD,
    database: values.DATABASE_NAME,
    ssl: values.DATABASE_SSL,
  },
  corsOrigin: values.CORS_ORIGIN,
};
