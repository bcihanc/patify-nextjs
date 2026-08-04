import {
  PetType, LfUserSummary, PET_TYPE_LABELS, petTypeLabel,
} from '@/lib/lost-found/types';

export type EmergencyKind = 'yarali' | 'tehlikede' | 'istismar' | 'olu';
export type EmergencyStatus = 'acik' | 'ustlenildi' | 'cozuldu' | 'pasif';

export const EMERGENCY_KIND_LABELS: Record<EmergencyKind, string> = {
  yarali: 'Yaralı',
  tehlikede: 'Tehlikede',
  istismar: 'İstismar',
  olu: 'Ölü',
};

export const EMERGENCY_STATUS_LABELS: Record<EmergencyStatus, string> = {
  acik: 'Açık',
  ustlenildi: 'Üstlenildi',
  cozuldu: 'Çözüldü',
  pasif: 'Pasif',
};

// Browse/nearby sayfalama boyutu — read.ts (server-only) VE client bileşenlerinden ortak kullanım için burada.
export const PER_PAGE = 10;

// Non-owner reads carry MASKED lat/long (grid ~100-150m); owner reads carry raw.
export type EmergencyListing = {
  id: string;
  createdAt: string;
  reporterUserId: string;
  reporter: LfUserSummary | null;
  kind: EmergencyKind;
  petType: PetType;
  description: string | null;
  photoUrl: string;
  city: string | null;
  district: string | null;
  status: EmergencyStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  lat: number | null;
  long: number | null;
  distMeters: number | null;
};

export type EmergencyFilters = {
  kinds: EmergencyKind[];
  statuses: EmergencyStatus[];
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  search: string;
};

export const EMPTY_EMERGENCY_FILTERS: EmergencyFilters = {
  kinds: [],
  statuses: [],
  city: null,
  district: null,
  radiusKm: null,
  search: '',
};

// RPC row (snake_case) — browse/nearby/in_bounds ortak şekli.
export type EmergencyRow = {
  id: string;
  created_at: string;
  reporter_user_id: string;
  reporter: { id: string; username: string | null; profile_photo: string | null; created_at: string } | null;
  kind: EmergencyKind;
  pet_type: PetType;
  description: string | null;
  photo_url: string;
  city: string | null;
  district: string | null;
  status: EmergencyStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  lat: number | null;
  long: number | null;
  dist_meters: number | null;
};

// Re-export from lost-found for convenience
export type { PetType, LfUserSummary };
export { PET_TYPE_LABELS, petTypeLabel };
