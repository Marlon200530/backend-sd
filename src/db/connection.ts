import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
import { env } from "../../env.js";

<<<<<<< HEAD
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export const db = drizzle(pool, { schema });
=======
function shouldUseSsl(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  return (
    sslMode === "require" ||
    sslMode === "verify-full" ||
    url.hostname.includes("supabase.com") ||
    url.hostname.includes("neon.tech")
  );
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ...(shouldUseSsl(env.DATABASE_URL) ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });
>>>>>>> 884a15f (fix production bugs)
