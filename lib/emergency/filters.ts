// Filter model persistence — server-safe (no server-only imports: this file
// is imported from the 'use client' filter bar and browse-list). Mirrors
// Adoptions' lib/adoptions/filters.ts, narrowed to the emergency field set
// (Task 5 brief: kinds/statuses/city/district/radiusKm/search — no pet
// size/gender/age/source/health-bool).

import { EMPTY_EMERGENCY_FILTERS } from './types';
import type { EmergencyFilters, EmergencyKind, EmergencyStatus } from './types';

// Distinct key from Adoptions' 'adoption_filter_snapshot_v1' (Task 5 brief).
const STORAGE_KEY = 'emergency_filters';

const VALID_KINDS: readonly EmergencyKind[] = ['yarali', 'tehlikede', 'istismar', 'olu'];
const VALID_STATUSES: readonly EmergencyStatus[] = ['acik', 'ustlenildi', 'cozuldu', 'pasif'];

function decodeEnumList<T extends string>(raw: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  const validSet = new Set<string>(valid);
  return raw.filter((v): v is T => typeof v === 'string' && validSet.has(v));
}

function decodeStringOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function decodeNumberOrNull(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

// The persistable subset of EmergencyFilters — `search` is deliberately
// excluded: a stale search term reappearing on the next visit reads as a bug.
type EncodedFilters = {
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  kinds: EmergencyKind[];
  statuses: EmergencyStatus[];
};

function toEncoded(f: EmergencyFilters): EncodedFilters {
  return {
    city: f.city,
    district: f.district,
    radiusKm: f.radiusKm,
    kinds: f.kinds,
    statuses: f.statuses,
  };
}

// Total: every field falls back to its EMPTY_EMERGENCY_FILTERS default
// individually, so a missing key, a renamed enum, or a hand-edited value
// never throws — losing one filter is a nuisance, failing to render the page is not.
function decodeFromObject(obj: Record<string, unknown>): EmergencyFilters {
  return {
    city: decodeStringOrNull(obj.city),
    district: decodeStringOrNull(obj.district),
    radiusKm: decodeNumberOrNull(obj.radiusKm),
    kinds: decodeEnumList<EmergencyKind>(obj.kinds, VALID_KINDS),
    statuses: decodeEnumList<EmergencyStatus>(obj.statuses, VALID_STATUSES),
    search: '', // excluded from the snapshot — never restored
  };
}

type StoredSnapshot = EncodedFilters & { owner: string | null };

export function saveFilterSnapshot(ownerId: string | null, f: EmergencyFilters): void {
  if (typeof window === 'undefined') return;
  const stamped: StoredSnapshot = { owner: ownerId, ...toEncoded(f) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
}

// Returns EMPTY_EMERGENCY_FILTERS when there's no snapshot, it's unreadable,
// or it was stamped for a different account — so filters never leak across
// accounts on a shared device.
export function loadFilterSnapshot(ownerId: string | null): EmergencyFilters {
  if (typeof window === 'undefined') return EMPTY_EMERGENCY_FILTERS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_EMERGENCY_FILTERS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_EMERGENCY_FILTERS;
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_EMERGENCY_FILTERS;

  const obj = parsed as Record<string, unknown>;
  const storedOwner = decodeStringOrNull(obj.owner);
  if (storedOwner !== ownerId) return EMPTY_EMERGENCY_FILTERS;
  return decodeFromObject(obj);
}

// --- Mutual exclusion -------------------------------------------------
// city/district and radius are alternative answers to "where" — never both
// (mirrors Adoptions' design spec §5.5). Each setter clears the other side.

export function withCity(f: EmergencyFilters, city: string | null): EmergencyFilters {
  return { ...f, city, district: null, radiusKm: city != null ? null : f.radiusKm };
}

export function withDistrict(f: EmergencyFilters, district: string | null): EmergencyFilters {
  return { ...f, district, radiusKm: district != null ? null : f.radiusKm };
}

export function withRadius(f: EmergencyFilters, radiusKm: number | null): EmergencyFilters {
  return {
    ...f,
    radiusKm,
    city: radiusKm != null ? null : f.city,
    district: radiusKm != null ? null : f.district,
  };
}

export function hasActiveFilters(f: EmergencyFilters): boolean {
  return (
    f.city !== null ||
    f.district !== null ||
    f.radiusKm !== null ||
    f.kinds.length > 0 ||
    f.statuses.length > 0 ||
    f.search.trim().length > 0
  );
}
