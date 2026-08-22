'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './auth';
import type { ReportEntity } from './moderation';

type ActionResult = { ok: true } | { error: string };

// Kalıcı ban = ~100 yıl sonlu süre. banned_until='infinity' KULLANMA — o, hesap
// silmenin tombstone değeri (account_deletions ile karışır). Geçici ban = durationHours.
const PERMANENT_BAN_DURATION = '876000h';

export async function banUser(
  entity: ReportEntity,
  entityId: string,
  targetUserId: string,
  reason: string,
  durationHours?: number,
): Promise<ActionResult> {
  const adminId = await requireAdmin(); // layout'a güvenme — action kendi başına doğrular.

  // 0 (veya negatif) durationHours "falsy" değil — `durationHours ? ... : PERMANENT`
  // 0'ı kalıcı bana çevirirdi (footgun). Açıkça > 0 kontrol ediyoruz.
  const hasFiniteDuration = typeof durationHours === 'number' && durationHours > 0;

  // (b) Gerçek enforcement: Supabase Auth admin API, service-role ile.
  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: hasFiniteDuration ? `${durationHours}h` : PERMANENT_BAN_DURATION,
  });
  if (authError) {
    console.error('banUser (auth):', authError.message);
    return { error: 'Kullanıcı banlanamadı (Auth hatası).' };
  }

  // (c) Bizim metadata/audit kaydımız — null = kalıcı, aksi halde now()+duration.
  const bannedUntil = hasFiniteDuration
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null;
  const { error: banRowError } = await admin
    .from('user_bans')
    .upsert({ user_id: targetUserId, banned_by: adminId, reason, banned_until: bannedUntil });
  if (banRowError) {
    console.error('banUser (user_bans):', banRowError.message);
    return { error: 'Ban kaydı yazılamadı.' };
  }

  // (d) Raporu çözümle + moderation_actions audit satırı (RPC içeride yazıyor).
  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc('admin_ban_finalize', {
    p_entity: entity, p_entity_id: entityId, p_target_user: targetUserId, p_reason: reason,
  });
  if (rpcError) {
    console.error('banUser (finalize):', rpcError.message);
    return { error: 'Kullanıcı banlandı ama rapor kapatılamadı, tekrar dene.' };
  }

  revalidatePath('/admin/moderation');
  return { ok: true };
}
