// Filter model persistence — server-safe (no server-only imports: this file
// is imported from the 'use client' filter bar and browse-list). Mirrors the
// mobile app's FilterSnapshotStore + codec pair
// (patify Flutter: lib/utils/list_filter_prefs.dart,
// lib/features/lost_found/states/lost_found_filter_persistence.dart) —
// same key, same "search excluded / total decoder / owner-stamped" rules.

import { EMPTY_LF_FILTERS, PET_COLORS } from './types';
import type { LfFilters, LfStatus, PetColorKey, PetType } from './types';

const STORAGE_KEY = 'lf_filter_snapshot_v1';

const VALID_TYPES: readonly PetType[] = [
  'dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'turtle', 'reptile', 'other',
];
// 'pasif' is intentionally excluded — never offered as a filter (design spec §6.5).
const VALID_STATUSES: readonly LfStatus[] = ['kayip', 'bulundu', 'cozuldu'];
const VALID_COLORS: readonly PetColorKey[] = PET_COLORS;

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

function decodeBool(raw: unknown): boolean {
  return raw === true;
}

// The persistable subset of LfFilters — `search` is deliberately excluded:
// a stale search term reappearing on the next visit reads as a bug.
type EncodedFilters = {
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  types: PetType[];
  statuses: LfStatus[];
  colors: PetColorKey[];
  rewardOnly: boolean;
};

function toEncoded(f: LfFilters): EncodedFilters {
  return {
    city: f.city,
    district: f.district,
    radiusKm: f.radiusKm,
    types: f.types,
    statuses: f.statuses,
    colors: f.colors,
    rewardOnly: f.rewardOnly,
  };
}

// Total: every field falls back to its EMPTY_LF_FILTERS default individually,
// so a missing key, a renamed enum, or a hand-edited value never throws —
// losing one filter is a nuisance, failing to render the page is not.
function decodeFromObject(obj: Record<string, unknown>): LfFilters {
  return {
    city: decodeStringOrNull(obj.city),
    district: decodeStringOrNull(obj.district),
    radiusKm: decodeNumberOrNull(obj.radiusKm),
    types: decodeEnumList<PetType>(obj.types, VALID_TYPES),
    statuses: decodeEnumList<LfStatus>(obj.statuses, VALID_STATUSES),
    colors: decodeEnumList<PetColorKey>(obj.colors, VALID_COLORS),
    search: '', // excluded from the snapshot — never restored
    rewardOnly: decodeBool(obj.rewardOnly),
  };
}

export function encodeFilters(f: LfFilters): string {
  return JSON.stringify(toEncoded(f));
}

export function decodeFilters(json: string): LfFilters {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return EMPTY_LF_FILTERS;
  }
  if (typeof raw !== 'object' || raw === null) return EMPTY_LF_FILTERS;
  return decodeFromObject(raw as Record<string, unknown>);
}

type StoredSnapshot = EncodedFilters & { owner: string | null };

export function saveFilterSnapshot(ownerId: string | null, f: LfFilters): void {
  if (typeof window === 'undefined') return;
  const stamped: StoredSnapshot = { owner: ownerId, ...toEncoded(f) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
}

// Returns EMPTY_LF_FILTERS when there's no snapshot, it's unreadable, or it
// was stamped for a different account — so filters never leak across
// accounts on a shared device.
export function loadFilterSnapshot(ownerId: string | null): LfFilters {
  if (typeof window === 'undefined') return EMPTY_LF_FILTERS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_LF_FILTERS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_LF_FILTERS;
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_LF_FILTERS;

  const obj = parsed as Record<string, unknown>;
  const storedOwner = decodeStringOrNull(obj.owner);
  if (storedOwner !== ownerId) return EMPTY_LF_FILTERS;
  return decodeFromObject(obj);
}

// --- Mutual exclusion -------------------------------------------------
// city/district and radius are alternative answers to "where" — never both
// (design spec §6.5). Each setter clears the other side.

export function withCity(f: LfFilters, city: string | null): LfFilters {
  return { ...f, city, district: null, radiusKm: city != null ? null : f.radiusKm };
}

export function withDistrict(f: LfFilters, district: string | null): LfFilters {
  return { ...f, district, radiusKm: district != null ? null : f.radiusKm };
}

export function withRadius(f: LfFilters, radiusKm: number | null): LfFilters {
  return {
    ...f,
    radiusKm,
    city: radiusKm != null ? null : f.city,
    district: radiusKm != null ? null : f.district,
  };
}

export function hasActiveFilters(f: LfFilters): boolean {
  return (
    f.city !== null ||
    f.district !== null ||
    f.radiusKm !== null ||
    f.types.length > 0 ||
    f.statuses.length > 0 ||
    f.colors.length > 0 ||
    f.search.trim().length > 0 ||
    f.rewardOnly
  );
}
