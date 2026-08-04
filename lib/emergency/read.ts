import { createClient } from '@/lib/supabase/server';
import { PER_PAGE } from './types';
import type {
  EmergencyFilters, EmergencyKind, EmergencyListing, EmergencyRow, EmergencyStatus,
} from './types';

export { PER_PAGE };

const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;
const toImageUrl = (f: string) => `${STORAGE_PUBLIC_BASE}/${f}`;

export function mapRowToEmergency(r: EmergencyRow): EmergencyListing {
  return {
    id: r.id,
    createdAt: r.created_at,
    reporterUserId: r.reporter_user_id,
    reporter: r.reporter
      ? { id: r.reporter.id, username: r.reporter.username, profilePhoto: r.reporter.profile_photo }
      : null,
    kind: r.kind, petType: r.pet_type, description: r.description,
    photoUrl: toImageUrl(r.photo_url),
    city: r.city, district: r.district,
    status: r.status, claimedBy: r.claimed_by, claimedAt: r.claimed_at, resolvedAt: r.resolved_at,
    // Sokak hayvanı — owner-aware maskeleme yok, RPC'den gelen lat/long maskesiz geçer (spec §8).
    lat: r.lat, long: r.long, distMeters: r.dist_meters,
  };
}

// Filtre → RPC param'ları (boş dizi/null = filtre yok).
function arrParam<T>(a: T[]): T[] | null { return a.length ? a : null; }

// Mobil parite: feed/harita varsayılanı yalnızca AKTİF vakalar. Mobil
// controller kEmergencyActiveStatuses'u (acik + ustlenildi) browse/nearby/
// in_bounds'a zorlar; çözülmüş/pasif vakalar "şimdi yardım lazım" akışını
// kirletmemeli. `emergency_cases_in_bounds` server-side yalnızca `pasif`'i
// eler, `cozuldu`'yu değil — bu yüzden taban client'ta uygulanır.
const ACTIVE_STATUSES: EmergencyStatus[] = ['acik', 'ustlenildi'];

type FilterParams = {
  kind_param: EmergencyKind[] | null;
  status_param: EmergencyStatus[] | null;
};

function filterParams(filters: EmergencyFilters): FilterParams {
  return {
    kind_param: arrParam(filters.kinds),
    // Kullanıcı statü seçmediyse aktif tabana düş; seçtiyse (süperset — mobilde
    // olmayan web filtresi) çözülmüş/pasif dahil o seçim geçer.
    status_param: filters.statuses.length ? filters.statuses : ACTIVE_STATUSES,
  };
}

export async function browseEmergency(
  filters: EmergencyFilters, page: number, reporterUserId?: string,
): Promise<EmergencyListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('browse_emergency_cases', {
      limits: PER_PAGE, offsets: page * PER_PAGE,
      city_param: filters.city, district_param: filters.district,
      ...filterParams(filters),
      reporter_user_id_param: reporterUserId ?? null,
      search_param: filters.search.trim() || null,
    })
    .returns<EmergencyRow[]>();
  if (error || !data) { if (error) console.error('browseEmergency:', error.message); return []; }
  return (data as EmergencyRow[]).map(mapRowToEmergency);
}

export async function nearbyEmergency(
  lat: number, long: number, filters: EmergencyFilters, page: number,
): Promise<EmergencyListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('nearby_emergency_cases', {
      lat_param: lat, long_param: long, limits: PER_PAGE, offsets: page * PER_PAGE,
      ...filterParams(filters),
      max_distance_m_param: filters.radiusKm != null ? filters.radiusKm * 1000 : null,
    })
    .returns<EmergencyRow[]>();
  if (error || !data) { if (error) console.error('nearbyEmergency:', error.message); return []; }
  return (data as EmergencyRow[]).map(mapRowToEmergency);
}

export type MapBounds = { minLat: number; minLong: number; maxLat: number; maxLong: number };

export async function emergencyInBounds(
  bounds: MapBounds, filters: EmergencyFilters,
): Promise<EmergencyListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('emergency_cases_in_bounds', {
      min_lat: bounds.minLat, min_long: bounds.minLong,
      max_lat: bounds.maxLat, max_long: bounds.maxLong,
      ...filterParams(filters),
      limits: 500,
      // in_bounds city_param/district_param/search_param KABUL ETMEZ.
    })
    .returns<EmergencyRow[]>();
  if (error || !data) { if (error) console.error('emergencyInBounds:', error.message); return []; }
  return (data as EmergencyRow[]).map(mapRowToEmergency);
}

export async function getEmergencyById(id: string): Promise<EmergencyListing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_emergency_case_by_id', { case_id: id })
    .returns<EmergencyRow[]>();
  if (error || !data) {
    if (error) console.error('getEmergencyById:', error.message);
    return null;
  }
  const rows = data as EmergencyRow[];
  if (rows.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mapRowToEmergency(rows[0]!);
}
