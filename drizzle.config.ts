import { defineConfig } from "drizzle-kit";
import { env } from "./env.js";

<<<<<<< HEAD
=======
function databaseUrlForMigrations() {
  const url = new URL(env.DATABASE_URL);

  if (
    !url.searchParams.has("sslmode") &&
    (url.hostname.includes("supabase.com") || url.hostname.includes("neon.tech"))
  ) {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
}

>>>>>>> 884a15f (fix production bugs)
export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
<<<<<<< HEAD
    url: env.DATABASE_URL
  }
});
=======
    url: databaseUrlForMigrations(),
  }
});
>>>>>>> 884a15f (fix production bugs)
