import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Returns the current user's id if they are an admin, else null. No redirect.
export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user.id : null
}

// Layout/page gate: anon → login; non-admin → 404 (don't reveal the panel).
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) notFound()
  return user.id
}
