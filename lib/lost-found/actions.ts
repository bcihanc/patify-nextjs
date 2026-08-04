'use server';

import { createClient } from '@/lib/supabase/server';
import { browseLostFound, nearbyLostFound, lostFoundInBounds } from './read';
import type { MapBounds } from './read';
import { EMPTY_LF_FILTERS } from './types';
import type { LfFilters, LfStatus, PetType, PetGender, PetColorKey, LostFoundListing } from './types';

export type ListingInput = {
  type: PetType;
  // Create only ever offers kayip/bulundu (ListingForm's segmented control).
  // Widened to full LfStatus so a locked edit (cozuldu/pasif) can resubmit its
  // own unchanged status — updateListingAction writes it as-is either way.
  status: LfStatus;
  city: string;
  district?: string | null;
  breed?: string | null;
  color?: PetColorKey | null;
  gender?: PetGender | null;
  lostDate?: string | null; // 'YYYY-MM-DD'
  description?: string | null;
  images: string[]; // bare filenames, create'te ≥1
  rewardOffered?: boolean;
  rewardAmount?: number | null;
  cipNo?: string | null;
  // WKT longitude-first 'POINT(lon lat)' or null
  locationWkt?: string | null;
};

type Result = { ok: true; id?: string } | { error: string };

const RATE_LIMIT_SENTINEL = 'lost_found_create_rate_limit';

// Temel normalize: trim + boş→null. React render'da zaten escape eder (XSS yok).
function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

export async function createListingAction(input: ListingInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!input.type || !input.city || !input.status) return { error: 'Zorunlu alanlar eksik.' };
  if (!input.images || input.images.length === 0) return { error: 'En az bir fotoğraf ekle.' };

  const row: Record<string, unknown> = {
    user_id: user.id,
    type: input.type,
    status: input.status,
    city: clean(input.city),
    district: clean(input.district),
    breed: clean(input.breed),
    color: input.color ?? null,
    gender: input.gender ?? null,
    lost_date: input.lostDate ?? null,
    description: clean(input.description),
    images: input.images,
    reward_offered: input.rewardOffered ?? false,
    reward_amount: input.rewardOffered ? (input.rewardAmount ?? null) : null,
  };
  if (input.locationWkt) row.location = input.locationWkt;

  // Açık kolon listesi — .select('*') YASAK (location SELECT revoke → 42501).
  const { data, error } = await supabase
    .from('lost_found').insert(row).select('id').single();
  if (error) {
    if (error.message.includes(RATE_LIMIT_SENTINEL)) {
      return { error: 'Saatte en fazla 10 ilan verebilirsin, biraz sonra tekrar dene.' };
    }
    console.error('createListingAction:', error.message);
    return { error: 'İlan oluşturulamadı, tekrar dene.' };
  }
  const id = data.id as string;

  // cip_no ayrı owner-only tabloya — başarısız olsa da ilan zaten oluştu.
  const cip = clean(input.cipNo);
  if (cip) {
    const { error: cipErr } = await supabase
      .from('lost_found_private').upsert({ lost_found_id: id, cip_no: cip });
    if (cipErr) console.error('createListingAction cip:', cipErr.message);
  }
  return { ok: true, id };
}

export async function updateListingAction(
  id: string, input: ListingInput & { clearLocation?: boolean },
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!input.type || !input.city || !input.status) return { error: 'Zorunlu alanlar eksik.' };

  const row: Record<string, unknown> = {
    type: input.type, status: input.status,
    city: clean(input.city), district: clean(input.district),
    breed: clean(input.breed), color: input.color ?? null, gender: input.gender ?? null,
    lost_date: input.lostDate ?? null, description: clean(input.description),
    images: input.images,
    reward_offered: input.rewardOffered ?? false,
    reward_amount: input.rewardOffered ? (input.rewardAmount ?? null) : null,
    updated_at: new Date().toISOString(),
  };
  if (input.locationWkt) row.location = input.locationWkt;
  else if (input.clearLocation) row.location = null; // yalnızca açık temizlemede null'la

  // .select('id') ile eşleşen satırı doğrula — 0 satır PostgREST'te hata fırlatmaz,
  // doğrulanmadan cip_no yazmak başkasının ilanına yazma açığı olur.
  const { data: updated, error } = await supabase
    .from('lost_found').update(row).eq('id', id).eq('user_id', user.id).select('id');
  if (error) { console.error('updateListingAction:', error.message); return { error: 'Güncellenemedi, tekrar dene.' }; }
  if (!updated || updated.length === 0) { return { error: 'Bu ilanı düzenleme yetkin yok.' }; }

  const cip = clean(input.cipNo);
  if (cip) await supabase.from('lost_found_private').upsert({ lost_found_id: id, cip_no: cip });
  return { ok: true, id };
}

export async function deleteListingAction(id: string, images?: string[]): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  // Hard delete (soft deleted_at admin-only). user_id scope + RLS.
  const { error } = await supabase.from('lost_found').delete().eq('id', id).eq('user_id', user.id);
  if (error) { console.error('deleteListingAction:', error.message); return { error: 'Silinemedi, tekrar dene.' }; }
  // Best-effort görsel temizliği (bare filenames).
  if (images && images.length) {
    const paths = images.map((u) => u.split('/').pop()).filter((x): x is string => !!x);
    if (paths.length) await supabase.storage.from('assets').remove(paths);
  }
  return { ok: true };
}

export async function markReunitedAction(id: string, viaPatify: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('mark_reunited', {
    p_listing_id: id, p_via_patify: viaPatify, p_helper_user_id: null,
  });
  if (error) { console.error('markReunitedAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true };
}

export async function reactivateListingAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('reactivate_lost_found', { p_listing_id: id });
  if (error) { console.error('reactivateListingAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true };
}

export async function bumpActivityAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('bump_lost_found_activity', { p_listing_id: id });
  if (error) { console.error('bumpActivityAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true };
}

// Client'ın browse-list.tsx'inden çağrılır — filtre değişince ilk sayfadan,
// "Daha fazla yükle" ile sonraki sayfalardan.
export async function loadBrowseAction(filters: LfFilters, page: number): Promise<LostFoundListing[]> {
  return browseLostFound(filters, page);
}

// Radius filtresi aktifken (geolocation alınabildiğinde) browse yerine bu kullanılır.
export async function loadNearbyAction(
  lat: number, long: number, filters: LfFilters, page: number,
): Promise<LostFoundListing[]> {
  return nearbyLostFound(lat, long, filters, page);
}

// Client'ın map-view.tsx'inden çağrılır — ilk yüklemede ve "Bu alanı ara"
// tıklamasında geçerli viewport bbox'ı sorgular (client'tan RPC'ye erişim
// için 'use server' action gerekli — lostFoundInBounds server-only).
export async function mapInBoundsAction(
  bounds: MapBounds, filters: LfFilters = EMPTY_LF_FILTERS,
): Promise<LostFoundListing[]> {
  return lostFoundInBounds(bounds, filters);
}
