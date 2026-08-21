import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';
import type { ReportType } from '@/lib/reports/types';

// admin_report_queue()'nun entity kolonu — DB report_entity enum'u (9 değer).
// lib/reports/types.ts'teki SupabaseEntity'nin süperseti 'emergency' içerir ama
// bu admin RPC'leri emergency'yi hiç kapsamıyor (spec §6.2) — o yüzden burada ayrı tip.
export type ReportEntity =
  | 'posts' | 'post_comments' | 'discussion' | 'discussion_answers'
  | 'discussion_answer_comments' | 'adoptions' | 'adoption_comments'
  | 'lost_found' | 'lost_found_sightings';

// admin_report_queue() satırı (snake_case, RPC'den geldiği gibi).
type ReportQueueRow = {
  entity: ReportEntity;
  entity_id: string;
  report_count: number;
  distinct_reporters: number;
  types: Partial<Record<ReportType, number>>;
  first_at: string;
  last_at: string;
  owner_id: string | null;
  owner_username: string | null;
  owner_recent_blockers: number;
  content_preview: string | null;
  content_exists: boolean;
};

export type ReportQueueItem = {
  entity: ReportEntity;
  entityId: string;
  reportCount: number;
  distinctReporters: number;
  types: Partial<Record<ReportType, number>>;
  firstAt: string;
  lastAt: string;
  ownerId: string | null;
  ownerUsername: string | null;
  ownerRecentBlockers: number;
  contentPreview: string | null;
  contentExists: boolean;
};

function mapQueueRow(r: ReportQueueRow): ReportQueueItem {
  return {
    entity: r.entity,
    entityId: r.entity_id,
    reportCount: r.report_count,
    distinctReporters: r.distinct_reporters,
    types: r.types ?? {},
    firstAt: r.first_at,
    lastAt: r.last_at,
    ownerId: r.owner_id,
    ownerUsername: r.owner_username,
    ownerRecentBlockers: r.owner_recent_blockers,
    contentPreview: r.content_preview,
    contentExists: r.content_exists,
  };
}

// Server Component'ten (moderation/page.tsx) doğrudan çağrılır. RPC zaten is_admin()
// guard'lı — non-admin çağrısı 'not_admin' hatasıyla reddedilir, burada boş dizi döner
// (layout zaten notFound() ile non-admin'i engelliyor; bu yalnızca savunma katmanı).
export async function getReportQueue(): Promise<ReportQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_report_queue');
  if (error || !data) {
    if (error) console.error('getReportQueue:', error.message);
    return [];
  }
  // .returns<T[]>() supabase-js'te bu RPC şekliyle sahte "single object to array"
  // tip hatası veriyor (setof olmayan TABLE(...) dönüşü) — düz cast ile aşılıyor.
  return (data as ReportQueueRow[]).map(mapQueueRow);
}

type ActionResult = { ok: true } | { error: string };

// Dosya tek — read fn'leri client component import edemesin diye ayrı 'use server'
// modülüne bölmek yerine, her aksiyon kendi gövdesinde 'use server' taşıyor (Next.js
// per-function directive) — böylece getReportQueue plain server-side fn olarak kalıyor.
export async function dismissReport(
  entity: ReportEntity, entityId: string, note: string,
): Promise<ActionResult> {
  'use server';
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
  'use server';
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
  'use server';
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
  'use server';
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_warn_user', {
    p_entity: entity, p_entity_id: entityId, p_message: message,
  });
  if (error) { console.error('warnUser:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/moderation');
  return { ok: true };
}
