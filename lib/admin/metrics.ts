import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

// admin_metric_series() satırı (RPC'den geldiği gibi, snake_case). Fixture günü
// (2026-07-19) RPC tarafında zaten hariç tutuluyor — burada tekrar filtrelemiyoruz.
type MetricSeriesRow = { day: string; dims: unknown; value: number };

export type MetricPoint = { day: string; dims: Record<string, unknown> | null; value: number };

async function fetchSeries(metric: string, days: number): Promise<MetricPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_metric_series', {
    p_metric: metric,
    p_days: days,
  });
  if (error) {
    console.error(`fetchSeries(${metric}):`, error.message);
    throw new Error(`fetchSeries(${metric}): ${error.message}`);
  }
  if (!data) return [];
  return (data as MetricSeriesRow[]).map((r) => ({
    day: r.day,
    dims: (r.dims as Record<string, unknown> | null) ?? null,
    value: r.value,
  }));
}

// Metrik boşsa (henüz veri yok) [] döner — sayfa "veri yok" gösterir, hatayla karıştırılmaz.
function latestDay(points: MetricPoint[]): MetricPoint[] {
  if (points.length === 0) return [];
  const maxDay = points.reduce((max, p) => (p.day > max ? p.day : max), points[0]!.day);
  return points.filter((p) => p.day === maxDay);
}

function dimsStage(dims: Record<string, unknown> | null): string {
  const stage = dims?.stage;
  return typeof stage === 'string' ? stage : '—';
}

export type NorthStarPoint = { day: string; rate: number | null; responded: number; total: number };

// İkili North Star çerçevesi (spec §6.4): oran + n her zaman birlikte — asla çıplak %.
export async function getNorthStarTrend(days = 60): Promise<NorthStarPoint[]> {
  await requireAdmin();
  const [rates, responded, totals] = await Promise.all([
    fetchSeries('north_star_response_rate_48h', days),
    fetchSeries('north_star_responded_count', days),
    fetchSeries('north_star_total_count', days),
  ]);
  const respByDay = new Map(responded.map((p) => [p.day, p.value]));
  const totalByDay = new Map(totals.map((p) => [p.day, p.value]));
  return rates.map((p) => ({
    day: p.day,
    rate: p.value,
    responded: respByDay.get(p.day) ?? 0,
    total: totalByDay.get(p.day) ?? 0,
  }));
}

export type TrendPoint = { day: string; value: number };

export async function getRetentionTrend(days = 60): Promise<TrendPoint[]> {
  await requireAdmin();
  const points = await fetchSeries('retention_rate', days);
  return points.map((p) => ({ day: p.day, value: p.value }));
}

export type StageValue = { stage: string; value: number };

// Funnel'ların son günü — aşamalar arasında doğal bir sıra garantisi RPC'den gelmiyor,
// azalan değere göre sıralamak "huni" görünümünü yaklaşık olarak korur.
async function getLatestStages(metric: string): Promise<StageValue[]> {
  const points = await fetchSeries(metric, 30);
  return latestDay(points)
    .map((p) => ({ stage: dimsStage(p.dims), value: p.value }))
    .sort((a, b) => b.value - a.value);
}

export async function getSignupFunnel(): Promise<StageValue[]> {
  await requireAdmin();
  return getLatestStages('funnel_signup_stage');
}

export async function getAdoptionFunnel(): Promise<StageValue[]> {
  await requireAdmin();
  return getLatestStages('funnel_adoption_stage');
}

export async function getLostFoundFunnel(): Promise<StageValue[]> {
  await requireAdmin();
  return getLatestStages('funnel_lost_found_stage');
}

export type DeadFeatureValue = { label: string; value: number };

async function getLatestDeadFeature(metric: string): Promise<DeadFeatureValue[]> {
  const points = await fetchSeries(metric, 14);
  return latestDay(points).map((p) => ({
    label:
      p.dims && Object.keys(p.dims).length > 0
        ? Object.entries(p.dims)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(', ')
        : 'genel',
    value: p.value,
  }));
}

export async function getDeadFeature30d(): Promise<DeadFeatureValue[]> {
  await requireAdmin();
  return getLatestDeadFeature('dead_feature_active_30d');
}

export async function getDeadFeature90d(): Promise<DeadFeatureValue[]> {
  await requireAdmin();
  return getLatestDeadFeature('dead_feature_active_90d');
}

// admin_content_health() satırı (surface/status/n, RPC'den geldiği gibi).
type ContentHealthRow = { surface: string; status: string; n: number };
export type ContentHealthGroup = { surface: string; rows: { status: string; n: number }[] };

export async function getContentHealth(): Promise<ContentHealthGroup[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_content_health');
  if (error) {
    console.error('getContentHealth:', error.message);
    throw new Error(`getContentHealth: ${error.message}`);
  }
  if (!data) return [];
  const bySurface = new Map<string, { status: string; n: number }[]>();
  for (const r of data as ContentHealthRow[]) {
    const list = bySurface.get(r.surface) ?? [];
    list.push({ status: r.status, n: r.n });
    bySurface.set(r.surface, list);
  }
  return Array.from(bySurface.entries()).map(([surface, rows]) => ({ surface, rows }));
}
