'use server';

import { createClient } from '@/lib/supabase/server';

// DM opt-out preference (spec §7). `accepts_dms` isn't in database.types.ts
// yet (mobile already writes it; the Supabase client here isn't parameterized
// with `Database` anyway — see lib/supabase/server.ts), but the column exists
// on the live `user_private` table.
//
// Mirrors mobile's SupabaseDmPermissionRepo (dm_permission_repo.dart):
// no row / no user / read error → fail-open (accepts DMs), matching the
// server-side coalesce the `can_dm()` RPC is expected to apply once Chats
// ships.
export async function fetchAcceptsDms(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { data } = await supabase
    .from('user_private')
    .select('accepts_dms')
    .eq('user_id', user.id)
    .maybeSingle();

  return (data?.accepts_dms as boolean | undefined) ?? true;
}

export async function setAcceptsDmsAction(
  value: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };

  // user_id from the session only, never client-supplied — same
  // defense-in-depth as acceptConsentAction. upsert so the row is created if
  // this is the user's first write to user_private.
  const { error } = await supabase
    .from('user_private')
    .upsert({ user_id: user.id, accepts_dms: value });

  if (error) {
    console.error('setAcceptsDmsAction:', error.message);
    return { error: 'Kaydedilemedi, tekrar dene.' };
  }

  return { ok: true };
}
