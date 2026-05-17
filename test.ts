// test-neon.ts
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;


const pool = new Pool({
  connectionString: "postgresql://postgres.wgcpjbqrjmmotauncqws:qX7N4dEG7XkivXMu@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
});

const result = await pool.query("select now()");
console.log(result.rows);

await pool.end();


// qX7N4dEG7XkivXMu