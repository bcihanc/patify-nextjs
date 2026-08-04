// Filter model persistence — server-safe (no server-only imports: this file
// is imported from the 'use client' filter bar and browse-list). Mirrors F3's
// lib/lost-found/filters.ts — same "search excluded / total decoder /
// owner-stamped" rules, adoption field set (design spec §5.5).

import { EMPTY_ADOPTION_FILTERS } from './types';
import type { AdoptionFilters, AdoptionSource, PetAge, PetGender, PetSize, PetType } from './types';

const STORAGE_KEY = 'adoption_filter_snapshot_v1';

const VALID_SOURCES: readonly AdoptionSource[] = [
  'street', 'shelter', 'home', 'temporary_home', 'veterinary_clinic',
];
const VALID_TYPES: readonly PetType[] = [
  'dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'turtle', 'reptile', 'other',
];
const VALID_SIZES: readonly PetSize[] = ['small', 'medium', 'large'];
const VALID_AGES: readonly PetAge[] = ['baby', 'young', 'adult', 'senior'];
const VALID_GENDERS: readonly PetGender[] = ['male', 'female'];

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

// Domain booleans are only ever `true` or `null` — never `false`. The read
// layer passes them straight through to the RPC params, so a stored `false`
// would over-filter (Task 5 brief constraint).
function decodeTrueOrNull(raw: unknown): boolean | null {
  return raw === true ? true : null;
}

// The persistable subset of AdoptionFilters — `search` is deliberately
// excluded: a stale search term reappearing on the next visit reads as a bug.
type EncodedFilters = {
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  sources: AdoptionSource[];
  types: PetType[];
  sizes: PetSize[];
  ages: PetAge[];
  genders: PetGender[];
  neutered: boolean | null;
  vaccinated: boolean | null;
  goodWithKids: boolean | null;
  goodWithPets: boolean | null;
};

function toEncoded(f: AdoptionFilters): EncodedFilters {
  return {
    city: f.city,
    district: f.district,
    radiusKm: f.radiusKm,
    sources: f.sources,
    types: f.types,
    sizes: f.sizes,
    ages: f.ages,
    genders: f.genders,
    neutered: f.neutered,
    vaccinated: f.vaccinated,
    goodWithKids: f.goodWithKids,
    goodWithPets: f.goodWithPets,
  };
}

// Total: every field falls back to its EMPTY_ADOPTION_FILTERS default
// individually, so a missing key, a renamed enum, or a hand-edited value
// never throws — losing one filter is a nuisance, failing to render the page is not.
function decodeFromObject(obj: Record<string, unknown>): AdoptionFilters {
  return {
    city: decodeStringOrNull(obj.city),
    district: decodeStringOrNull(obj.district),
    radiusKm: decodeNumberOrNull(obj.radiusKm),
    sources: decodeEnumList<AdoptionSource>(obj.sources, VALID_SOURCES),
    types: decodeEnumList<PetType>(obj.types, VALID_TYPES),
    sizes: decodeEnumList<PetSize>(obj.sizes, VALID_SIZES),
    ages: decodeEnumList<PetAge>(obj.ages, VALID_AGES),
    genders: decodeEnumList<PetGender>(obj.genders, VALID_GENDERS),
    search: '', // excluded from the snapshot — never restored
    neutered: decodeTrueOrNull(obj.neutered),
    vaccinated: decodeTrueOrNull(obj.vaccinated),
    goodWithKids: decodeTrueOrNull(obj.goodWithKids),
    goodWithPets: decodeTrueOrNull(obj.goodWithPets),
  };
}

export function encodeFilters(f: AdoptionFilters): string {
  return JSON.stringify(toEncoded(f));
}

export function decodeFilters(json: string): AdoptionFilters {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return EMPTY_ADOPTION_FILTERS;
  }
  if (typeof raw !== 'object' || raw === null) return EMPTY_ADOPTION_FILTERS;
  return decodeFromObject(raw as Record<string, unknown>);
}

type StoredSnapshot = EncodedFilters & { owner: string | null };

export function saveFilterSnapshot(ownerId: string | null, f: AdoptionFilters): void {
  if (typeof window === 'undefined') return;
  const stamped: StoredSnapshot = { owner: ownerId, ...toEncoded(f) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
}

// Returns EMPTY_ADOPTION_FILTERS when there's no snapshot, it's unreadable,
// or it was stamped for a different account — so filters never leak across
// accounts on a shared device.
export function loadFilterSnapshot(ownerId: string | null): AdoptionFilters {
  if (typeof window === 'undefined') return EMPTY_ADOPTION_FILTERS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_ADOPTION_FILTERS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_ADOPTION_FILTERS;
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_ADOPTION_FILTERS;

  const obj = parsed as Record<string, unknown>;
  const storedOwner = decodeStringOrNull(obj.owner);
  if (storedOwner !== ownerId) return EMPTY_ADOPTION_FILTERS;
  return decodeFromObject(obj);
}

// --- Mutual exclusion -------------------------------------------------
// city/district and radius are alternative answers to "where" — never both
// (design spec §5.5). Each setter clears the other side.

export function withCity(f: AdoptionFilters, city: string | null): AdoptionFilters {
  return { ...f, city, district: null, radiusKm: city != null ? null : f.radiusKm };
}

export function withDistrict(f: AdoptionFilters, district: string | null): AdoptionFilters {
  return { ...f, district, radiusKm: district != null ? null : f.radiusKm };
}

export function withRadius(f: AdoptionFilters, radiusKm: number | null): AdoptionFilters {
  return {
    ...f,
    radiusKm,
    city: radiusKm != null ? null : f.city,
    district: radiusKm != null ? null : f.district,
  };
}

export function hasActiveFilters(f: AdoptionFilters): boolean {
  return (
    f.city !== null ||
    f.district !== null ||
    f.radiusKm !== null ||
    f.sources.length > 0 ||
    f.types.length > 0 ||
    f.sizes.length > 0 ||
    f.ages.length > 0 ||
    f.genders.length > 0 ||
    f.search.trim().length > 0 ||
    f.neutered === true ||
    f.vaccinated === true ||
    f.goodWithKids === true ||
    f.goodWithPets === true
  );
}
