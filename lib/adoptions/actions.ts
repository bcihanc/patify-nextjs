'use server';

import { createClient } from '@/lib/supabase/server';
import { browseAdoptions, nearbyAdoptions, adoptionsInBounds } from './read';
import type { MapBounds } from './read';
import { EMPTY_ADOPTION_FILTERS } from './types';
import type {
  AdoptionExtraInfo, AdoptionFilters, AdoptionListing, AdoptionSource,
  PetAge, PetGender, PetSize, PetType,
} from './types';

export type AdoptionInput = {
  title: string;
  type: PetType;
  city: string;
  district?: string | null;
  breed?: string | null;
  description?: string | null;
  source?: AdoptionSource | null;
  gender?: PetGender | null;
  size?: PetSize | null;
  age?: PetAge | null;
  images: string[]; // bare filenames
  neutered?: boolean | null;
  vaccinated?: boolean | null;
  goodWithKids?: boolean | null;
  goodWithPets?: boolean | null;
  extraInfo?: AdoptionExtraInfo | null;
  // WKT longitude-first 'POINT(lon lat)' or null — create'te ZORUNLU (adoptions.location NOT NULL).
  locationWkt?: string | null;
};

type Result = { ok: true; id?: string } | { error: string };

const RATE_LIMIT_SENTINEL = 'adoption_create_rate_limit';

// Temel normalize: trim + boş→null. React render'da zaten escape eder (XSS yok).
function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

function cleanExtraInfo(e: AdoptionExtraInfo | null | undefined): AdoptionExtraInfo | null {
  if (!e) return null;
  return {
    healthNotes: clean(e.healthNotes),
    personalityTags: Array.isArray(e.personalityTags) ? e.personalityTags : [],
    personalityDesc: clean(e.personalityDesc),
    adoptionRequirements: clean(e.adoptionRequirements),
    returnPolicy: clean(e.returnPolicy),
  };
}

export async function createAdoptionAction(input: AdoptionInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!input.title || !input.type || !input.city) return { error: 'Zorunlu alanlar eksik.' };
  // adoptions.location NOT NULL — pin konulmadan insert reddedilir.
  if (!input.locationWkt) return { error: 'İlanın konumunu belirlemelisin.' };

  const row: Record<string, unknown> = {
    user_id: user.id,
    title: clean(input.title),
    type: input.type,
    location: input.locationWkt,
    city: clean(input.city),
    district: clean(input.district),
    breed: clean(input.breed),
    description: clean(input.description),
    source: input.source ?? null,
    gender: input.gender ?? null,
    size: input.size ?? null,
    age: input.age ?? null,
    images: input.images,
    videos: [],
    neutered: input.neutered ?? null,
    vaccinated: input.vaccinated ?? null,
    good_with_kids: input.goodWithKids ?? null,
    good_with_pets: input.goodWithPets ?? null,
    extra_info: cleanExtraInfo(input.extraInfo),
  };

  // Açık kolon listesi — .select('*') YASAK (location SELECT revoke → 42501).
  const { data, error } = await supabase
    .from('adoptions').insert(row).select('id').single();
  if (error) {
    if (error.message.includes(RATE_LIMIT_SENTINEL)) {
      return { error: 'Saatte en fazla 10 ilan verebilirsin, biraz sonra tekrar dene.' };
    }
    console.error('createAdoptionAction:', error.message);
    return { error: 'İlan oluşturulamadı, tekrar dene.' };
  }
  return { ok: true, id: data.id as string };
}

export async function updateAdoptionAction(
  id: string, input: AdoptionInput & { keepExistingLocation?: boolean },
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!input.title || !input.type || !input.city) return { error: 'Zorunlu alanlar eksik.' };

  const row: Record<string, unknown> = {
    title: clean(input.title),
    type: input.type,
    city: clean(input.city),
    district: clean(input.district),
    breed: clean(input.breed),
    description: clean(input.description),
    source: input.source ?? null,
    gender: input.gender ?? null,
    size: input.size ?? null,
    age: input.age ?? null,
    images: input.images,
    // 4 domain-bool + extra_info force-include (undefined→null) — aksi halde
    // partial update semantiğinde temizlenen değer eski satırda kalır (stale).
    neutered: input.neutered ?? null,
    vaccinated: input.vaccinated ?? null,
    good_with_kids: input.goodWithKids ?? null,
    good_with_pets: input.goodWithPets ?? null,
    extra_info: cleanExtraInfo(input.extraInfo),
  };
  // location NOT NULL — yalnızca yeni pin konulduğunda gönder; keepExistingLocation
  // veya pin yoksa satırdan tamamen çıkar (asla null'lama, F3'ün clearLocation'ının aksine).
  if (!input.keepExistingLocation && input.locationWkt) row.location = input.locationWkt;

  // .select('id') ile eşleşen satırı doğrula — 0 satır PostgREST'te hata fırlatmaz,
  // doğrulanmadan ok dönmek başkasının ilanına yazma açığı olur.
  const { data: updated, error } = await supabase
    .from('adoptions').update(row).eq('id', id).eq('user_id', user.id).select('id');
  if (error) { console.error('updateAdoptionAction:', error.message); return { error: 'Güncellenemedi, tekrar dene.' }; }
  if (!updated || updated.length === 0) { return { error: 'Bu ilanı düzenleme yetkin yok.' }; }
  return { ok: true, id };
}

export async function deleteAdoptionAction(id: string, images?: string[]): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  // Hard delete. user_id scope + RLS.
  const { error } = await supabase.from('adoptions').delete().eq('id', id).eq('user_id', user.id);
  if (error) { console.error('deleteAdoptionAction:', error.message); return { error: 'Silinemedi, tekrar dene.' }; }
  // Best-effort görsel temizliği (bare filenames).
  if (images && images.length) {
    const paths = images.map((u) => u.split('/').pop()).filter((x): x is string => !!x);
    if (paths.length) await supabase.storage.from('assets').remove(paths);
  }
  return { ok: true };
}

export async function markAdoptedAction(id: string, adopted: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { data: updated, error } = await supabase
    .from('adoptions').update({ adopted }).eq('id', id).eq('user_id', user.id).select('id');
  if (error) { console.error('markAdoptedAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  if (!updated || updated.length === 0) { return { error: 'Bu ilan üzerinde yetkin yok.' }; }
  return { ok: true, id };
}

export async function bumpAdoptionAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('bump_adoption_activity', { p_listing_id: id });
  if (error) { console.error('bumpAdoptionAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true };
}

export async function reactivateAdoptionAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('reactivate_adoption', { p_listing_id: id });
  if (error) { console.error('reactivateAdoptionAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true };
}

// Client'ın browse-list.tsx'inden çağrılır — filtre değişince ilk sayfadan,
// "Daha fazla yükle" ile sonraki sayfalardan.
export async function loadBrowseAdoptionsAction(filters: AdoptionFilters, page: number): Promise<AdoptionListing[]> {
  return browseAdoptions(filters, page);
}

// Radius filtresi aktifken (geolocation alınabildiğinde) browse yerine bu kullanılır.
export async function loadNearbyAdoptionsAction(
  lat: number, long: number, filters: AdoptionFilters, page: number,
): Promise<AdoptionListing[]> {
  return nearbyAdoptions(lat, long, filters, page);
}

// Client'ın map-view.tsx'inden çağrılır — ilk yüklemede ve "Bu alanı ara"
// tıklamasında geçerli viewport bbox'ı sorgular (client'tan RPC'ye erişim
// için 'use server' action gerekli — adoptionsInBounds server-only).
export async function adoptionsInBoundsAction(
  bounds: MapBounds, filters: AdoptionFilters = EMPTY_ADOPTION_FILTERS,
): Promise<AdoptionListing[]> {
  return adoptionsInBounds(bounds, filters);
}
