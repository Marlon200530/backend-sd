import path from "path";
import dotenv from "dotenv";
import z, { ZodError } from "zod";

const environment = process.env.NODE_ENV ?? 'development';

dotenv.config({ path: path.resolve(process.cwd(), `.env.${environment}`) });

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("NODE_ENV:", environment);

const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');


const EnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  APP_NAME: z.string().min(3).max(30),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  CORS_ORIGIN: z.string().startsWith("http://"),
  ACCESS_TOKEN_SECRET: z.string().min(30).max(255),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(30).max(255),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
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
    return env.NODE_ENV === 'production'
}

export function isDev() {
    return env.NODE_ENV === 'development'
}

export function isTest() {
    return env.NODE_ENV === 'test'
}

export {env};
