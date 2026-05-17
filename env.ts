import path from "path";
import dotenv from "dotenv";
import z, { ZodError } from "zod";

<<<<<<< HEAD
const environment = process.env.NODE_ENV ?? 'development';
=======
const environment = process.env.NODE_ENV ?? "development";
>>>>>>> 884a15f (fix production bugs)

dotenv.config({ path: path.resolve(process.cwd(), `.env.${environment}`) });

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

<<<<<<< HEAD
console.log("NODE_ENV:", environment);

const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

=======
const nodeEnvSchema = z.enum(["development", "production", "test"]).default("development");
>>>>>>> 884a15f (fix production bugs)

const EnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  APP_NAME: z.string().min(3).max(30),
<<<<<<< HEAD
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  CORS_ORIGIN: z.string().startsWith("http://"),
=======
  APP_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default("http://localhost:5173")
    .refine(
      (value) =>
        value === "*" ||
        value
          .split(",")
          .map((origin) => origin.trim())
          .every((origin) => z.string().url().safeParse(origin).success),
      "CORS_ORIGIN deve ser '*' ou uma lista de URLs separadas por vírgula.",
    ),
>>>>>>> 884a15f (fix production bugs)
  ACCESS_TOKEN_SECRET: z.string().min(30).max(255),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(30).max(255),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
<<<<<<< HEAD
=======
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_BUCKET_RESOURCES: z.string().min(1),
>>>>>>> 884a15f (fix production bugs)
});

export type Env = z.infer<typeof EnvSchema>;

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (e: unknown) {
  if (e instanceof ZodError) {
    console.error("Invalid env vars");
    console.error(JSON.stringify(e.flatten().fieldErrors, null, 2));
  } else if (e instanceof Error) {
    console.error("Failed to parse environment configuration");
    console.error(e.stack ?? e.message);
  } else {
    console.error("Failed to parse environment configuration");
    console.error(e);
  }

  process.exit(1);
}


export function isProd() {
<<<<<<< HEAD
    return env.NODE_ENV === 'production'
}

export function isDev() {
    return env.NODE_ENV === 'development'
}

export function isTest() {
    return env.NODE_ENV === 'test'
=======
  return env.NODE_ENV === "production";
}

export function isDev() {
  return env.NODE_ENV === "development";
}

export function isTest() {
  return env.NODE_ENV === "test";
>>>>>>> 884a15f (fix production bugs)
}

export {env};
