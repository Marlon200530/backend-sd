import { createClient } from "@supabase/supabase-js";
<<<<<<< HEAD
=======
import { env } from "../../../env.js";
>>>>>>> 884a15f (fix production bugs)

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
<<<<<<< HEAD
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL não foi definido no .env.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não foi definido no .env.");
  }

  client ??= createClient(supabaseUrl, supabaseServiceRoleKey);
=======
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
>>>>>>> 884a15f (fix production bugs)

  return client;
}
