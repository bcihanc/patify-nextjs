import { createClient } from '@/lib/supabase/server';
import { PER_PAGE } from './types';
import type { LfFilters, LfListRow, LostFoundListing } from './types';

export { PER_PAGE };

const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;
const toImageUrl = (f: string) => `${STORAGE_PUBLIC_BASE}/${f}`;

export function mapRowToListing(r: LfListRow): LostFoundListing {
  return {
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    user: r.user
      ? { id: r.user.id, username: r.user.username, profilePhoto: r.user.profile_photo }
      : null,
    type: r.type, breed: r.breed, color: r.color, gender: r.gender,
    city: r.city, district: r.district, status: r.status,
    lostDate: r.lost_date, description: r.description,
    images: r.images?.map(toImageUrl) ?? null,
    lat: r.lat, long: r.long, distMeters: r.dist_meters,
    rewardOffered: r.reward_offered, rewardAmount: r.reward_amount,
  };
}

// Filtre → RPC param'ları (boş dizi/null = filtre yok). 'pasif' status UI'dan gelmez.
function statusParam(s: LfFilters['statuses']): string[] | null { return s.length ? s : null; }
function typeParam(t: LfFilters['types']): string[] | null { return t.length ? t : null; }
function colorParam(c: LfFilters['colors']): string[] | null { return c.length ? c : null; }

export async function browseLostFound(
  filters: LfFilters, page: number, ownerUserId?: string,
): Promise<LostFoundListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('browse_lost_found', {
      city_param: filters.city, district_param: filters.district,
      type_param: typeParam(filters.types), status_param: statusParam(filters.statuses),
      owner_user_id_param: ownerUserId ?? null,
      limits: PER_PAGE, offsets: page * PER_PAGE,
      search_param: filters.search.trim() || null,
      color_param: colorParam(filters.colors), reward_only: filters.rewardOnly,
    })
    .returns<LfListRow[]>();
  if (error || !data) { if (error) console.error('browseLostFound:', error.message); return []; }
  return (data as LfListRow[]).map(mapRowToListing);
}

export async function nearbyLostFound(
  lat: number, long: number, filters: LfFilters, page: number,
): Promise<LostFoundListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('nearby_lost_found', {
      lat_param: lat, long_param: long, limits: PER_PAGE, offsets: page * PER_PAGE,
      city_param: filters.city, district_param: filters.district,
      type_param: typeParam(filters.types), status_param: statusParam(filters.statuses),
      owner_user_id_param: null, search_param: filters.search.trim() || null,
      color_param: colorParam(filters.colors), reward_only: filters.rewardOnly,
      max_distance_m_param: filters.radiusKm ? filters.radiusKm * 1000 : null,
    })
    .returns<LfListRow[]>();
  if (error || !data) { if (error) console.error('nearbyLostFound:', error.message); return []; }
  return (data as LfListRow[]).map(mapRowToListing);
}

export type MapBounds = { minLat: number; minLong: number; maxLat: number; maxLong: number };

export async function lostFoundInBounds(
  bounds: MapBounds, filters: LfFilters,
): Promise<LostFoundListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('lost_found_in_bounds', {
      min_lat: bounds.minLat, min_long: bounds.minLong,
      max_lat: bounds.maxLat, max_long: bounds.maxLong,
      city_param: filters.city, district_param: filters.district,
      type_param: typeParam(filters.types),
      // Haritada cozuldu asla gösterilmez.
      status_param: statusParam(filters.statuses.filter((s) => s !== 'cozuldu')),
      owner_user_id_param: null, search_param: filters.search.trim() || null,
      limits: 100, color_param: colorParam(filters.colors),
    })
    .returns<LfListRow[]>();
  if (error || !data) { if (error) console.error('lostFoundInBounds:', error.message); return []; }
  return (data as LfListRow[]).map(mapRowToListing).filter((l) => l.status !== 'cozuldu');
}

export async function getLostFoundDetail(id: string): Promise<LostFoundListing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_lost_found_detail', { p_id: id })
    .returns<LfListRow[]>();
  if (error || !data) {
    if (error) console.error('getLostFoundDetail:', error.message);
    return null;
  }
  const rows = data as LfListRow[];
  if (rows.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mapRowToListing(rows[0]!);
}
