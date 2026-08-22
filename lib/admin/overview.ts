import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

// admin_overview_counts() jsonb şekli (RPC'den geldiği gibi, snake_case).
// ns_rate null olabilir (henüz metrics_daily snapshot'ı yoksa).
type OverviewRow = {
  open_reports: number;
  sla_breaches: number;
  critical_emergencies: number;
  aging_lost_found: number;
  aging_adoptions: number;
  ns_rate: number | null;
  ns_responded: number;
  ns_total: number;
  resolved_lf_7d: number;
  resolved_lf_via_patify_7d: number;
  resolved_emergency_7d: number;
  adopted_total: number;
  signups_7d: number;
  active_users_30d: number;
};

export type Overview = {
  openReports: number;
  slaBreaches: number;
  criticalEmergencies: number;
  agingLostFound: number;
  agingAdoptions: number;
  nsRate: number | null;
  nsResponded: number;
  nsTotal: number;
  resolvedLf7d: number;
  resolvedLfViaPatify7d: number;
  resolvedEmergency7d: number;
  adoptedTotal: number;
  signups7d: number;
  activeUsers30d: number;
};

function mapOverview(r: OverviewRow): Overview {
  return {
    openReports: r.open_reports ?? 0,
    slaBreaches: r.sla_breaches ?? 0,
    criticalEmergencies: r.critical_emergencies ?? 0,
    agingLostFound: r.aging_lost_found ?? 0,
    agingAdoptions: r.aging_adoptions ?? 0,
    nsRate: r.ns_rate,
    nsResponded: r.ns_responded ?? 0,
    nsTotal: r.ns_total ?? 0,
    resolvedLf7d: r.resolved_lf_7d ?? 0,
    resolvedLfViaPatify7d: r.resolved_lf_via_patify_7d ?? 0,
    resolvedEmergency7d: r.resolved_emergency_7d ?? 0,
    adoptedTotal: r.adopted_total ?? 0,
    signups7d: r.signups_7d ?? 0,
    activeUsers30d: r.active_users_30d ?? 0,
  };
}

// Server Component'ten (admin/page.tsx) doğrudan çağrılır. Layout zaten requireAdmin
// çağırıyor ama read kendi başına da doğruluyor (belt-and-suspenders — bkz. ban.ts/moderation-actions.ts).
// Gerçek bir RPC hatasını (ör. DB kesintisi) sessizce maskelemiyoruz — fırlatıp
// error boundary'ye bırakıyoruz (fail loud), P1 read'lerle aynı sözleşme.
export async function getOverview(): Promise<Overview> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_overview_counts');
  if (error) {
    console.error('getOverview:', error.message);
    throw new Error(`getOverview: ${error.message}`);
  }
  if (!data) throw new Error('getOverview: RPC boş jsonb döndü');
  // Returns: Json (tekil jsonb) — supabase-js bunu geniş union olarak tipliyor,
  // düz cast ile aşılıyor (bkz. lib/notifications/read.ts aynı desen).
  return mapOverview(data as unknown as OverviewRow);
}
