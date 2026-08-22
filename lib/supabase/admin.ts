import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// SERVER-ONLY. Bypasses RLS — use ONLY for operations that genuinely require it
// (e.g. Supabase Auth admin ban). Never import from a Client Component.
// SUPABASE_SERVICE_ROLE_KEY must never be exposed as NEXT_PUBLIC_*.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('createAdminClient: SUPABASE_SERVICE_ROLE_KEY missing (server-only)')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
