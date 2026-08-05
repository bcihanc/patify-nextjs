import { createClient } from '@/lib/supabase/server';
import { mapRowToNotification, type AppNotification, type NotificationRow } from './types';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, category, type, title, body, url, data, is_read, created_at')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(200);

  if (error) {
    console.error('fetchNotifications:', error.message);
    return [];
  }

  return ((data as unknown as NotificationRow[]) || []).map(mapRowToNotification);
}
