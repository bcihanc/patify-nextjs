'use server';

// Ayrı dosya (moderation.ts'ten): 'use server' modülü tüm export'ları action
// referansına çevirir, ama Next bir client component ondan herhangi bir şey
// import ettiğinde next/headers kullanan (createClient) reads'i de bundle'a
// çekmeye çalışıyor — build'de "You're importing next/headers in Pages Router"
// hatası verdi. Reads (getReportQueue, next/headers'a bağımlı) client'a hiç
// görünmemeli; bu yüzden aksiyonlar kendi dosyasında.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';
import type { ReportEntity } from './moderation';

type ActionResult = { ok: true } | { error: string };

export async function dismissReport(
  entity: ReportEntity, entityId: string, note: string,
): Promise<ActionResult> {
  await requireAdmin(); // layout'a güvenme — her action kendi başına doğrular.
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_dismiss_reports', {
    p_entity: entity, p_entity_id: entityId, p_note: note,
  });
  if (error) { console.error('dismissReport:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/moderation');
  return { ok: true };
}

export async function hideContent(
  entity: ReportEntity, entityId: string, reason: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_hide_content', {
    p_entity: entity, p_entity_id: entityId, p_reason: reason,
  });
  if (error) {
    // lost_found_sightings'te gizleme mekanizması yok — RPC bu adı fırlatır (UI zaten
    // bu entity için butonu disabled ediyor, bu yalnızca savunma katmanı).
    if (error.message.includes('hide_unsupported_for_sightings')) {
      return { error: 'Bu içerik türü gizlenemez.' };
    }
    console.error('hideContent:', error.message);
    return { error: 'İşlem başarısız, tekrar dene.' };
  }
  revalidatePath('/admin/moderation');
  return { ok: true };
}

export async function reactivateContent(entity: ReportEntity, entityId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_reactivate_content', {
    p_entity: entity, p_entity_id: entityId,
  });
  if (error) { console.error('reactivateContent:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/moderation');
  return { ok: true };
}

export async function warnUser(
  entity: ReportEntity, entityId: string, message: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_warn_user', {
    p_entity: entity, p_entity_id: entityId, p_message: message,
  });
  if (error) { console.error('warnUser:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/moderation');
  return { ok: true };
}
