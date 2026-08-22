'use server';

// Ayrı dosya (push.ts'ten) — moderation-actions.ts'teki not: client'a next/headers'lı
// reads'in bulaşmasını önlüyor.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

type BroadcastResult = { ok: true; count: number } | { error: string };

// SADECE uygulama-içi bildirim üretir (admin_broadcast_announcement) — OneSignal telefon
// push'u YOK. Geri alınamaz: gerçek kullanıcılara in-app bildirim gider.
// city === null → tüm kullanıcılar; aksi halde user_private.home_city eşleşmesi.
export async function broadcast(
  city: string | null,
  title: string,
  body: string
): Promise<BroadcastResult> {
  await requireAdmin(); // layout'a güvenme — her action kendi başına doğrular.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_broadcast_announcement', {
    p_city: city,
    p_title: title,
    p_body: body,
  });
  if (error) {
    if (error.message.includes('empty_message')) {
      return { error: 'Başlık ve mesaj boş olamaz.' };
    }
    console.error('broadcast:', error.message);
    return { error: 'Gönderim başarısız, tekrar dene.' };
  }
  revalidatePath('/admin/push');
  return { ok: true, count: (data as number) ?? 0 };
}
