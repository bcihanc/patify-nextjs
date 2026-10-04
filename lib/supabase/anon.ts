import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cookie-free anon client for PUBLIC reads. No session → callable inside
// unstable_cache (which forbids cookies()/headers()). Data is not user-specific.
export function anonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}
