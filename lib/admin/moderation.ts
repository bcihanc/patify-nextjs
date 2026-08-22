import { createClient } from '@/lib/supabase/server';
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

// Server Component'ten (moderation/page.tsx) doğrudan çağrılır. Gerçek bir RPC
// hatasını (ör. DB kesintisi) [] ile maskelemiyoruz — sessizce "Bekleyen rapor yok"
// göstermek yanıltıcı olur; fırlatıp error boundary'ye bırakıyoruz (fail loud).
// data null ama error yoksa (teorik, TABLE dönüşünde beklenmez) boş dizi.
export async function getReportQueue(): Promise<ReportQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_report_queue');
  if (error) {
    console.error('getReportQueue:', error.message);
    throw new Error(`getReportQueue: ${error.message}`);
  }
  if (!data) return [];
  // .returns<T[]>() supabase-js'te bu RPC şekliyle sahte "single object to array"
  // tip hatası veriyor (setof olmayan TABLE(...) dönüşü) — düz cast ile aşılıyor.
  return (data as ReportQueueRow[]).map(mapQueueRow);
}
