'use server';

import { createClient } from '@/lib/supabase/server';

type Result = { ok: true } | { error: string };

export async function markNotificationsReadAction(ids: number[]): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (ids.length === 0) return { ok: true };

  const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
  if (error) {
    console.error('markNotificationsReadAction:', error.message);
    return { error: 'İşlem başarısız, tekrar dene.' };
  }
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };

  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) {
    console.error('markAllNotificationsReadAction:', error.message);
    return { error: 'İşlem başarısız, tekrar dene.' };
  }
  return { ok: true };
}

export async function deleteNotificationsAction(ids: number[]): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (ids.length === 0) return { ok: true };

  const { error } = await supabase
    .from('notifications')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id);
  if (error) {
    console.error('deleteNotificationsAction:', error.message);
    return { error: 'Silinemedi, tekrar dene.' };
  }
  return { ok: true };
}

export async function deleteAllNotificationsAction(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);
  if (error) {
    console.error('deleteAllNotificationsAction:', error.message);
    return { error: 'Silinemedi, tekrar dene.' };
  }
  return { ok: true };
}
