import { createClient } from '@/lib/supabase/server';
import type { TrustProgress, TrustSignals } from './types';

// Server-only RPC read wrappers. Mirrors mobile `SupabaseTrustRepo`
// (lib/features/trust/data/trust_repo.dart) — exact RPC names/params.
// `trusted_member_flags` / `my_trust_progress` are NOT in database.types.ts
// (stale-typed client) but exist on the live DB; the Supabase client here is
// untyped, so `.returns<...>()` carries the shape.

// `trusted_member_flags(p_ids uuid[])` casts server-side, so a non-UUID id
// can only ever come back as a Postgres cast error (22P02). Ids that don't
// match this pattern never reach the wire; they keep their `false` default.
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const DEFAULT_TRUST_SIGNALS: TrustSignals = { photo: false, bio: false, listings: 0, reunions: 0, chats: 0 };
export const DEFAULT_TRUST_PROGRESS: TrustProgress = {
  isTrusted: false, ageOk: false, cleanOk: false, hasSignal: false,
  signals: DEFAULT_TRUST_SIGNALS, daysSinceSignup: 0,
};

export async function fetchTrustFlags(ids: string[]): Promise<Record<string, boolean>> {
  if (ids.length === 0) return {};
  const map: Record<string, boolean> = {};
  for (const id of ids) map[id] = false;
  const castable = ids.filter((id) => UUID_PATTERN.test(id));
  if (castable.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('trusted_member_flags', { p_ids: castable })
    .returns<{ user_id: string; is_trusted: boolean }[]>();
  if (error || !data) {
    if (error) console.error('fetchTrustFlags:', error.message);
    return map;
  }
  for (const row of data as { user_id: string; is_trusted: boolean }[]) {
    map[row.user_id] = row.is_trusted ?? false;
  }
  return map;
}

// RPC JSON keys are snake_case (mobile `TrustProgress.fromJson` uses
// field_rename: snake) — map defensively, missing/error → all-false/0.
type TrustProgressRow = {
  is_trusted?: boolean | null;
  age_ok?: boolean | null;
  clean_ok?: boolean | null;
  has_signal?: boolean | null;
  days_since_signup?: number | null;
  signals?: {
    photo?: boolean | null;
    bio?: boolean | null;
    listings?: number | null;
    reunions?: number | null;
    chats?: number | null;
  } | null;
};

export async function fetchMyTrustProgress(): Promise<TrustProgress> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('my_trust_progress')
    .returns<TrustProgressRow>();
  if (error || !data) {
    if (error) console.error('fetchMyTrustProgress:', error.message);
    return DEFAULT_TRUST_PROGRESS;
  }
  const row = data as TrustProgressRow;
  const s = row.signals;
  return {
    isTrusted: row.is_trusted ?? false,
    ageOk: row.age_ok ?? false,
    cleanOk: row.clean_ok ?? false,
    hasSignal: row.has_signal ?? false,
    signals: {
      photo: s?.photo ?? false,
      bio: s?.bio ?? false,
      listings: s?.listings ?? 0,
      reunions: s?.reunions ?? 0,
      chats: s?.chats ?? 0,
    },
    daysSinceSignup: row.days_since_signup ?? 0,
  };
}
