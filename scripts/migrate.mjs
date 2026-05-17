import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import "dotenv/config";
import pg from "pg";

const migrationsDir = path.resolve(process.cwd(), "drizzle");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL não foi definido.");
  process.exit(1);
}

function shouldUseSsl(urlString) {
  const url = new URL(urlString);
  const sslMode = url.searchParams.get("sslmode");

  return (
    sslMode === "require" ||
    sslMode === "verify-full" ||
    url.hostname.includes("supabase.com") ||
    url.hostname.includes("neon.tech")
  );
}

function splitStatements(sql) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 15_000,
  ...(shouldUseSsl(connectionString) ? { ssl: { rejectUnauthorized: false } } : {}),
});

await client.connect();

try {
  await client.query("create schema if not exists drizzle");
  await client.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);

  const appliedRows = await client.query("select hash from drizzle.__drizzle_migrations");
  const appliedHashes = new Set(appliedRows.rows.map((row) => row.hash));
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    const hash = crypto.createHash("sha256").update(sql).digest("hex");

    if (appliedHashes.has(hash)) {
      continue;
    }

    await client.query("begin");

    try {
      for (const statement of splitStatements(sql)) {
        await client.query(statement);
      }

      await client.query(
        "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
        [hash, Date.now()],
      );
      await client.query("commit");
      appliedCount += 1;
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log(
    appliedCount === 0
      ? "Migrations already up to date."
      : `Applied ${appliedCount} migration(s).`,
  );
} finally {
  await client.end();
}
