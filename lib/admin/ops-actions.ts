'use server';

// Ayrı dosya (ops.ts'ten) — aynı gerekçe: moderation-actions.ts'teki not'a bak
// (client'a next/headers'lı reads'in bulaşmasını önlüyor).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';
import type { ReleasePlatform } from './ops';

type ActionResult = { ok: true } | { error: string };

export async function setFlag(key: string, enabled: boolean): Promise<ActionResult> {
  await requireAdmin(); // layout'a güvenme — her action kendi başına doğrular.
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_flag', { p_key: key, p_enabled: enabled });
  if (error) { console.error('setFlag:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/ops');
  return { ok: true };
}

export async function setReleaseGate(params: {
  platform: ReleasePlatform;
  minBuild: number;
  recommendedBuild: number;
  maintenance: boolean;
  messageTr: string;
  messageEn: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_release_gate', {
    p_platform: params.platform,
    p_min_build: params.minBuild,
    p_recommended_build: params.recommendedBuild,
    p_maintenance: params.maintenance,
    p_message_tr: params.messageTr,
    p_message_en: params.messageEn,
  });
  if (error) {
    // RPC'nin invaryant guardrail'i: min/recommended > latest_store_build → bu hata.
    // Genel "tekrar dene" yerine kullanıcıya nedenini açıkça söylüyoruz.
    if (error.message.includes('build_exceeds_store')) {
      return { error: 'Min/önerilen build, mağazadaki güncel build\'i geçemez.' };
    }
    console.error('setReleaseGate:', error.message);
    return { error: 'İşlem başarısız, tekrar dene.' };
  }
  revalidatePath('/admin/ops');
  return { ok: true };
}
