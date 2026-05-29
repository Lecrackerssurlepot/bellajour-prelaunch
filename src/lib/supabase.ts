import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur (service key — bypass RLS).
 * Factorisé depuis api/waitlist et api/referrer.
 * À n'utiliser que dans des contextes serveur (route handlers).
 */
export function makeSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
  return createClient(url, key);
}
