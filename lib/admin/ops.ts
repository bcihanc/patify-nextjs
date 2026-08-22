import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

export type AdminFlag = {
  key: string;
  enabled: boolean;
  updatedAt: string;
};

type FlagRow = { key: string; enabled: boolean; updated_at: string };

function mapFlag(r: FlagRow): AdminFlag {
  return { key: r.key, enabled: r.enabled, updatedAt: r.updated_at };
}

// Fail loud (bkz. lib/admin/content.ts) — RPC hatasını [] ile maskelemiyoruz.
export async function getFlags(): Promise<AdminFlag[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_get_flags');
  if (error) {
    console.error('getFlags:', error.message);
    throw new Error(`getFlags: ${error.message}`);
  }
  if (!data) return [];
  return (data as FlagRow[]).map(mapFlag);
}

export type ReleasePlatform = 'ios' | 'android';

export type ReleaseGate = {
  platform: ReleasePlatform;
  minBuildNumber: number;
  recommendedBuild: number;
  // Store'daki en güncel build — read-only, RPC'nin kendisi hesaplıyor (mobil publish
  // pipeline'ı günceller). Panel bunu yazmaz, yalnız invaryant sınırı olarak gösterir.
  latestStoreBuild: number;
  maintenance: boolean;
  messageTr: string | null;
  messageEn: string | null;
  storeUrl: string | null;
  updatedAt: string;
};

type ReleaseGateRow = {
  platform: string;
  min_build_number: number;
  recommended_build: number;
  latest_store_build: number;
  maintenance: boolean;
  message_tr: string | null;
  message_en: string | null;
  store_url: string | null;
  updated_at: string;
};

function mapReleaseGate(r: ReleaseGateRow): ReleaseGate {
  return {
    platform: r.platform as ReleasePlatform,
    minBuildNumber: r.min_build_number,
    recommendedBuild: r.recommended_build,
    latestStoreBuild: r.latest_store_build,
    maintenance: r.maintenance,
    messageTr: r.message_tr,
    messageEn: r.message_en,
    storeUrl: r.store_url,
    updatedAt: r.updated_at,
  };
}

// İki satır döner: ios, android (admin_get_release_gate her platform için bir satır).
export async function getReleaseGate(): Promise<ReleaseGate[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_get_release_gate');
  if (error) {
    console.error('getReleaseGate:', error.message);
    throw new Error(`getReleaseGate: ${error.message}`);
  }
  if (!data) return [];
  return (data as ReleaseGateRow[]).map(mapReleaseGate);
}
