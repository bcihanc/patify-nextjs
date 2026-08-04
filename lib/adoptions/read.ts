import { createClient } from '@/lib/supabase/server';
import { PER_PAGE } from './types';
import type {
  AdoptionExtraInfo, AdoptionFilters, AdoptionListing,
  AdoptionRow, AdoptionSource, PetAge, PetGender, PetSize, PetType,
} from './types';

export { PER_PAGE };

const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;
const toImageUrl = (f: string) => `${STORAGE_PUBLIC_BASE}/${f}`;

// jsonb → AdoptionExtraInfo; shape'i garanti etme, personalityTags eksikse [] varsay.
function mapExtraInfo(e: AdoptionRow['extra_info']): AdoptionExtraInfo | null {
  if (!e) return null;
  return {
    healthNotes: e.healthNotes ?? null,
    personalityTags: Array.isArray(e.personalityTags) ? e.personalityTags : [],
    personalityDesc: e.personalityDesc ?? null,
    adoptionRequirements: e.adoptionRequirements ?? null,
    returnPolicy: e.returnPolicy ?? null,
  };
}

export function mapRowToAdoption(r: AdoptionRow): AdoptionListing {
  return {
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    user: r.user
      ? { id: r.user.id, username: r.user.username, profilePhoto: r.user.profile_photo }
      : null,
    title: r.title, breed: r.breed, description: r.description,
    source: r.source, type: r.type, gender: r.gender, size: r.size, age: r.age,
    status: r.status, city: r.city, district: r.district,
    images: r.images?.map(toImageUrl) ?? null,
    adopted: r.adopted, commentEnabled: r.comment_enabled,
    neutered: r.neutered, vaccinated: r.vaccinated,
    goodWithKids: r.good_with_kids, goodWithPets: r.good_with_pets,
    extraInfo: mapExtraInfo(r.extra_info),
    lat: r.lat, long: r.long, distMeters: r.dist_meters,
    lifecycleLastActivityAt: r.lifecycle_last_activity_at,
  };
}

// Filtre → RPC param'ları (boş dizi/null = filtre yok).
function arrParam<T>(a: T[]): T[] | null { return a.length ? a : null; }

type FilterParams = {
  sources_filter_param: AdoptionSource[] | null;
  pet_types_filter_param: PetType[] | null;
  pet_sizes_filter_param: PetSize[] | null;
  pet_ages_filter_param: PetAge[] | null;
  pet_genders_filter_param: PetGender[] | null;
  neutered_param: boolean | null;
  vaccinated_param: boolean | null;
  good_with_kids_param: boolean | null;
  good_with_pets_param: boolean | null;
};

function filterParams(filters: AdoptionFilters): FilterParams {
  return {
    sources_filter_param: arrParam(filters.sources),
    pet_types_filter_param: arrParam(filters.types),
    pet_sizes_filter_param: arrParam(filters.sizes),
    pet_ages_filter_param: arrParam(filters.ages),
    pet_genders_filter_param: arrParam(filters.genders),
    neutered_param: filters.neutered ?? null,
    vaccinated_param: filters.vaccinated ?? null,
    good_with_kids_param: filters.goodWithKids ?? null,
    good_with_pets_param: filters.goodWithPets ?? null,
  };
}

export async function browseAdoptions(
  filters: AdoptionFilters, page: number, ownerUserId?: string,
): Promise<AdoptionListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('browse_adoptions', {
      limits: PER_PAGE, offsets: page * PER_PAGE,
      ...filterParams(filters),
      owner_user_id_param: ownerUserId ?? null,
      city_param: filters.city, district_param: filters.district,
      search_param: filters.search.trim() || null,
    })
    .returns<AdoptionRow[]>();
  if (error || !data) { if (error) console.error('browseAdoptions:', error.message); return []; }
  return (data as AdoptionRow[]).map(mapRowToAdoption);
}

export async function nearbyAdoptions(
  lat: number, long: number, filters: AdoptionFilters, page: number,
): Promise<AdoptionListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('nearby_adoptions', {
      lat_param: lat, long_param: long, limits: PER_PAGE, offsets: page * PER_PAGE,
      ...filterParams(filters),
      owner_user_id_param: null,
      city_param: filters.city, district_param: filters.district,
      search_param: filters.search.trim() || null,
      max_distance_m_param: filters.radiusKm ? filters.radiusKm * 1000 : null,
    })
    .returns<AdoptionRow[]>();
  if (error || !data) { if (error) console.error('nearbyAdoptions:', error.message); return []; }
  return (data as AdoptionRow[]).map(mapRowToAdoption);
}

export type MapBounds = { minLat: number; minLong: number; maxLat: number; maxLong: number };

export async function adoptionsInBounds(
  bounds: MapBounds, filters: AdoptionFilters,
): Promise<AdoptionListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('adoptions_in_bounds', {
      min_lat: bounds.minLat, min_long: bounds.minLong,
      max_lat: bounds.maxLat, max_long: bounds.maxLong,
      ...filterParams(filters),
      owner_user_id_param: null, limits: 500,
      // in_bounds city_param/district_param/search_param KABUL ETMEZ.
    })
    .returns<AdoptionRow[]>();
  if (error || !data) { if (error) console.error('adoptionsInBounds:', error.message); return []; }
  return (data as AdoptionRow[]).map(mapRowToAdoption);
}

export async function getAdoptionById(id: string): Promise<AdoptionListing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_adoption_by_id', { p_id: id })
    .returns<AdoptionRow[]>();
  if (error || !data) {
    if (error) console.error('getAdoptionById:', error.message);
    return null;
  }
  const rows = data as AdoptionRow[];
  if (rows.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mapRowToAdoption(rows[0]!);
}
