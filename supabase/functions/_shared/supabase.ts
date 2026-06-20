// Supabase clients. URL and keys are auto-injected into deployed edge functions;
// export them in the shell to run a function locally.

import { createClient } from "jsr:@supabase/supabase-js@2";

/** Anon client — public reads (notice / hotspot / artwork). */
export function anonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

/** Service-role client — privileged writes (e.g. Storage upload in /speak). */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
