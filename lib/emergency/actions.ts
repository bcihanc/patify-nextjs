'use server';

import { createClient } from '@/lib/supabase/server';
import { browseEmergency, nearbyEmergency, emergencyInBounds } from './read';
import type { MapBounds } from './read';
import { EMPTY_EMERGENCY_FILTERS } from './types';
import type {
  EmergencyFilters, EmergencyKind, EmergencyListing, PetType,
} from './types';

export type EmergencyInput = {
  kind: EmergencyKind;
  petType: PetType;
  description?: string | null;
  photoUrl: string;
  // WKT longitude-first 'POINT(lon lat)' or null — create'te ZORUNLU (emergency_cases.location NOT NULL).
  locationWkt?: string | null;
  city: string;
  district?: string | null;
};

type Result = { ok: true; id?: string } | { error: string };

const RATE_LIMIT_SENTINEL = 'emergency_create_rate_limit';

// Temel normalize: trim + boş→null. React render'da zaten escape eder (XSS yok).
function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

export async function createEmergencyAction(input: EmergencyInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!input.kind || !input.petType || !input.city) return { error: 'Zorunlu alanlar eksik.' };
  // emergency_cases.location NOT NULL — pin konulmadan insert reddedilir.
  if (!input.locationWkt) return { error: 'Vakanın konumunu belirlemelisin.' };

  const row: Record<string, unknown> = {
    // SESSION-AUTHORITATIVE — asla client input'tan gelmez.
    reporter_user_id: user.id,
    kind: input.kind,
    pet_type: input.petType,
    description: clean(input.description),
    photo_url: input.photoUrl,
    location: input.locationWkt,
    city: clean(input.city),
    district: clean(input.district),
  };

  // Açık kolon listesi — .select('*') YASAK (location SELECT revoke → 42501).
  const { data, error } = await supabase
    .from('emergency_cases').insert(row).select('id').single();
  if (error) {
    if (error.message.includes(RATE_LIMIT_SENTINEL)) {
      return { error: 'Kısa sürede çok fazla vaka bildirdin, biraz sonra tekrar dene.' };
    }
    console.error('createEmergencyAction:', error.message);
    return { error: 'Vaka oluşturulamadı, tekrar dene.' };
  }
  return { ok: true, id: data.id as string };
}

export async function claimEmergencyAction(id: string): Promise<{ ok: true; claimed: boolean } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase.rpc('claim_emergency_case', { case_id: id });
  if (error) { console.error('claimEmergencyAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  // false = başka biri önce üstlendi (race kaybedildi) — hata DEĞİL.
  return { ok: true, claimed: data === true };
}

export async function resolveEmergencyAction(id: string): Promise<{ ok: true; resolved: boolean } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase.rpc('resolve_emergency_case', { case_id: id });
  if (error) { console.error('resolveEmergencyAction:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  return { ok: true, resolved: data === true };
}

// Client'ın browse-list.tsx'inden çağrılır — filtre değişince ilk sayfadan,
// "Daha fazla yükle" ile sonraki sayfalardan.
export async function loadBrowseEmergencyAction(filters: EmergencyFilters, page: number): Promise<EmergencyListing[]> {
  return browseEmergency(filters, page);
}

// Radius filtresi aktifken (geolocation alınabildiğinde) browse yerine bu kullanılır.
export async function loadNearbyEmergencyAction(
  lat: number, long: number, filters: EmergencyFilters, page: number,
): Promise<EmergencyListing[]> {
  return nearbyEmergency(lat, long, filters, page);
}

// Client'ın map-view.tsx'inden çağrılır — ilk yüklemede ve "Bu alanı ara"
// tıklamasında geçerli viewport bbox'ı sorgular (client'tan RPC'ye erişim
// için 'use server' action gerekli — emergencyInBounds server-only).
export async function emergencyInBoundsAction(
  bounds: MapBounds, filters: EmergencyFilters = EMPTY_EMERGENCY_FILTERS,
): Promise<EmergencyListing[]> {
  return emergencyInBounds(bounds, filters);
}
