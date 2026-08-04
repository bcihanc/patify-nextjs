import { createClient } from '@/lib/supabase/server';
import type { PublicUserProfile } from './types';

// Başka bir kullanıcının public profili. `*` KULLANILMAZ — açık public kolon
// listesiyle user_private/PII kolonlarının sızması engellenir. RLS de owner-only
// alanları korur; bu ikinci savunma.
const PUBLIC_COLUMNS =
  'id, username, bio, profile_photo, x_url, instagram_url, telegram_url, tiktok_url, facebook_url';

export async function getPublicProfile(id: string): Promise<PublicUserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getPublicProfile:', error.message);
    return null;
  }
  return data;
}
