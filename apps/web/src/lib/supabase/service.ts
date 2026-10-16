import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/env";
import { getServerEnvironment } from "@/env/server";

export function createServiceClient() {
  const serverEnv = getServerEnvironment();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
