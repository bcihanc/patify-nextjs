# F3 — Lost & Found (Tam) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Web'e tam Lost & Found lifecycle'ı — authed browse+filtre+arama, harita (Google Maps), ilan oluştur/düzenle, benim ilanlarım, uygulama-içi detay + sahip aksiyonları — mevcut Supabase şemasına karşı (migration yok).

**Architecture:** Okumalar Server Component + `lib/lost-found/` server fn'leri (RPC-only, `.returns<Row[]>()`); yazımlar `lib/lost-found/actions.ts` Server Action'ları (session-authoritative, açık kolon listesi, `.select('*')` YASAK); liste/filtre client-side sonsuz kaydırma + localStorage; harita Google Maps JS (`@react-google-maps/api`, env key, key yoksa graceful degrade).

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`, Tailwind + shadcn/ui, lucide-react, `@react-google-maps/api`.

## Global Constraints
- **Dil:** TR-only.
- **TS strict:** `noUncheckedIndexedAccess` (`arr[0]!` + `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion`), `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- **Backend değişmez:** migration YOK. Tüm tablolar/RPC'ler mevcut (spec §5).
- **Okuma = RPC** `.rpc(name, params).returns<Row[]>()`; **yazım = açık kolon listesi**. `lost_found` üzerinde `.select('*')` **YASAK** (prod'da 42501 — `location` SELECT revoke).
- **PII/KVKK:** RPC'nin döndürdüğü maskeli `lat/long` kullanılır; raw `location` asla okunmaz. `cip_no` owner-only (`lost_found_private`); `phone_number` yazılmaz. `get_lost_found_by_id` (public) dokunulmaz.
- **Yazım session-authoritative:** `user_id` daima `getUser()`'dan; create/update/delete/lifecycle owner-check.
- **Supabase client:** Server → `await createClient()` (`@/lib/supabase/server`); Client → `createClient()` (`@/lib/supabase/client`).
- **Görsel:** `<img>` + `// eslint-disable-next-line @next/next/no-img-element`; `assets` bucket, bare filename.
- **WKT:** listing `location` = `'POINT(<lon> <lat>)'` (lon önce). EWKT değil.
- **Enum `.name`** DB label ile birebir; TR çeviri yalnızca UI label map'lerinde.
- **Harita:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` yoksa **graceful degrade, crash yok**. Key/billing kullanıcı sağlar.
- **Rota:** hepsi `app/(app)/lost-found/` altında (F0 gate korur). Statik segmentler (`map`,`mine`,`create`) `[id]` dinamikten önce çözülür (Next.js) — çakışma yok.
- **Test:** runner yok; her task `npm run build` temiz. Commit: explicit `git add <paths>` (asla `-am`/`add -A` — repo'da uncommitted `.gitignore` + untracked `deno.lock` var). `feat/web-f3-lost-found` branch; main'e/push YOK.

## File Structure
| Dosya | Sorumluluk | Task |
|---|---|---|
| `lib/lost-found/types.ts` | enum'lar (+pasif), renk/label, reward, `LostFoundListing`, `LfFilters`, RPC row tipleri | 1 |
| `lib/lost-found.ts` (güncelle) | `LfStatus`'a `pasif`; yeni modüle re-export köprüsü | 1 |
| `lib/lost-found/read.ts` | browse/nearby/inBounds/detail RPC wrapper + mapping | 2 |
| `lib/lost-found/actions.ts` | create/update/delete/lifecycle Server Action | 3 |
| `lib/storage/listing-images.ts` | çoklu görsel upload (assets, 1-3) | 4 |
| `components/lost-found/lf-status-badge.tsx`, `lf-listing-card.tsx` | durum/reward rozeti + liste tile | 5 |
| `app/(app)/lost-found/page.tsx` (değiş) + `browse-list.tsx` | browse liste + sonsuz kaydırma | 5 |
| `lib/lost-found/filters.ts` + `components/lost-found/lf-filter-bar.tsx` | filtre modeli + kalıcılık + UI | 6 |
| `app/(app)/lost-found/mine/page.tsx` | benim ilanlarım | 7 |
| `components/lost-found/listing-form.tsx` + `app/(app)/lost-found/create/page.tsx` | paylaşılan form + create | 8 |
| `app/(app)/lost-found/[id]/edit/page.tsx` + `edit-form.tsx` | edit (status-lock, chip hydrate) | 9 |
| `app/(app)/lost-found/[id]/page.tsx` + `owner-actions.tsx` | authed detay + sahip aksiyonları | 10 |
| `lib/maps/google-maps.tsx` + `app/(app)/lost-found/map/page.tsx` + `map-view.tsx` | Maps loader + harita görünümü | 11 |
| `components/lost-found/location-picker.tsx` | pin-picker (create/edit'e bağlanır) | 12 |
| nav/profile wiring | `/lost-found` linkleri, profil "İlanlarım" | 13 |

---

### Task 1: Domain tip katmanı

**Files:**
- Create: `lib/lost-found/types.ts`
- Modify: `lib/lost-found.ts` (LfStatus'a `pasif` ekle; `pasif` label)

**Interfaces — Produces:** `LfStatus`, `PetType`, `PetGender`, `PetColorKey`, `LF_STATUS_LABELS`, `PET_GENDER_LABELS`, `PET_COLOR_LABELS`, `PET_COLORS`, `LostFoundListing`, `LfUserSummary`, `LfFilters`, `LfListRow`.

- [ ] **Step 1:** `lib/lost-found/types.ts`:
```ts
export type LfStatus = 'kayip' | 'bulundu' | 'cozuldu' | 'pasif';
export type PetType =
  | 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster'
  | 'fish' | 'turtle' | 'reptile' | 'other';
export type PetGender = 'male' | 'female';
export type PetColorKey =
  | 'beyaz' | 'siyah' | 'gri' | 'kahverengi'
  | 'sari_krem' | 'kizil_turuncu' | 'alacali';

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: 'Köpek', cat: 'Kedi', bird: 'Kuş', rabbit: 'Tavşan', hamster: 'Hamster',
  fish: 'Balık', turtle: 'Kaplumbağa', reptile: 'Sürüngen', other: 'Diğer',
};
export const PET_GENDER_LABELS: Record<PetGender, string> = { male: 'Erkek', female: 'Dişi' };
export const PET_COLORS: PetColorKey[] = ['beyaz','siyah','gri','kahverengi','sari_krem','kizil_turuncu','alacali'];
export const PET_COLOR_LABELS: Record<PetColorKey, string> = {
  beyaz: 'Beyaz', siyah: 'Siyah', gri: 'Gri', kahverengi: 'Kahverengi',
  sari_krem: 'Sarı / Krem', kizil_turuncu: 'Kızıl / Turuncu', alacali: 'Alacalı',
};
export const LF_STATUS_LABELS: Record<LfStatus, string> = {
  kayip: 'Kayıp', bulundu: 'Bulundu', cozuldu: 'Ailesine kavuştu', pasif: 'Pasif',
};

export function petTypeLabel(t: PetType): string { return PET_TYPE_LABELS[t] ?? 'Diğer'; }

export type LfUserSummary = { id: string; username: string | null; profilePhoto: string | null };

// Non-owner reads carry MASKED lat/long (grid ~100-150m); owner reads carry raw.
export type LostFoundListing = {
  id: string;
  createdAt: string;
  userId: string;
  user: LfUserSummary | null;
  type: PetType;
  breed: string | null;
  color: string | null;
  gender: PetGender | null;
  city: string;
  district: string | null;
  status: LfStatus;
  lostDate: string | null;
  description: string | null;
  images: string[] | null; // full URLs
  lat: number | null;
  long: number | null;
  distMeters: number | null;
  rewardOffered: boolean;
  rewardAmount: number | null;
};

export type LfFilters = {
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  types: PetType[];
  statuses: LfStatus[]; // 'pasif' UI'da sunulmaz
  colors: PetColorKey[];
  search: string;
  rewardOnly: boolean;
};

export const EMPTY_LF_FILTERS: LfFilters = {
  city: null, district: null, radiusKm: null, types: [], statuses: [], colors: [], search: '', rewardOnly: false,
};

// RPC row (snake_case) — browse/nearby/in_bounds ortak şekli.
export type LfListRow = {
  id: string;
  created_at: string;
  user_id: string;
  user: { id: string; username: string | null; profile_photo: string | null; created_at: string } | null;
  type: PetType;
  breed: string | null;
  color: string | null;
  gender: PetGender | null;
  city: string;
  district: string | null;
  status: LfStatus;
  lost_date: string | null;
  description: string | null;
  images: string[] | null; // bare filenames
  lat: number | null;
  long: number | null;
  dist_meters: number | null;
  reward_offered: boolean;
  reward_amount: number | null;
};
```

- [ ] **Step 2:** `lib/lost-found.ts` — `LfStatus`'ı `'kayip'|'bulundu'|'cozuldu'|'pasif'` yap (mevcut `'kayip'|'bulundu'|'cozuldu'`'ye `| 'pasif'` ekle). Mevcut `getLostFoundById`/`PET_TYPE_LABELS`/public detay kullanımı bozulmaz (pasif eklemek union'ı genişletir; mevcut switch'ler exhaustive değilse `noImplicitReturns` etkilenmez — kontrol et, gerekiyorsa public detay `headline`'a pasif dalı ekleme GEREKMEZ çünkü public RPC pasif döndürmez).

- [ ] **Step 3:** `npm run build` temiz.
- [ ] **Step 4:** `git add lib/lost-found/types.ts lib/lost-found.ts && git commit -m "feat(f3): lost&found domain types (enums+pasif, colors, filters, list row)"`

---

### Task 2: Read layer (RPC wrapper + mapping)

**Files:** Create `lib/lost-found/read.ts`

**Interfaces — Consumes:** Task 1 tipleri; `createClient` (`@/lib/supabase/server`). **Produces:** `browseLostFound(filters, page)`, `nearbyLostFound(lat, long, filters, page)`, `lostFoundInBounds(bounds, filters)`, `getLostFoundDetail(id)`, `mapRowToListing(row)`, `PER_PAGE`.

- [ ] **Step 1:** `lib/lost-found/read.ts`:
```ts
import { createClient } from '@/lib/supabase/server';
import type { LfFilters, LfListRow, LostFoundListing } from './types';

export const PER_PAGE = 10;

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
  if (error) { console.error('browseLostFound:', error.message); return []; }
  return (data ?? []).map(mapRowToListing);
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
  if (error) { console.error('nearbyLostFound:', error.message); return []; }
  return (data ?? []).map(mapRowToListing);
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
  if (error) { console.error('lostFoundInBounds:', error.message); return []; }
  return (data ?? []).map(mapRowToListing).filter((l) => l.status !== 'cozuldu');
}

export async function getLostFoundDetail(id: string): Promise<LostFoundListing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_lost_found_detail', { p_id: id })
    .returns<LfListRow[]>();
  if (error || !data || data.length === 0) {
    if (error) console.error('getLostFoundDetail:', error.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mapRowToListing(data[0]!);
}
```

- [ ] **Step 2:** build temiz. **Step 3:** `git add lib/lost-found/read.ts && git commit -m "feat(f3): lost&found read layer (browse/nearby/in-bounds/detail RPC wrappers)"`

---

### Task 3: Write layer (Server Actions)

**Files:** Create `lib/lost-found/actions.ts`

**Interfaces — Produces:** `createListingAction(input)`, `updateListingAction(id, input)`, `deleteListingAction(id, images?)`, `markReunitedAction(id, viaPatify)`, `reactivateListingAction(id)`, `bumpActivityAction(id)`; `ListingInput` tipi. Dönüş `{ ok: true; id?: string } | { error: string }`.

- [ ] **Step 1:** `lib/lost-found/actions.ts` — `'use server'` başlığıyla:
```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import type { LfStatus, PetType, PetGender, PetColorKey } from './types';

export type ListingInput = {
  type: PetType;
  status: Extract<LfStatus, 'kayip' | 'bulundu'>;
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
    if (error.message.includes(RATE_LIMIT_SENTINEL) || error.code === '23514') {
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

  const { error } = await supabase
    .from('lost_found').update(row).eq('id', id).eq('user_id', user.id);
  if (error) { console.error('updateListingAction:', error.message); return { error: 'Güncellenemedi, tekrar dene.' }; }

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
```

- [ ] **Step 2:** build temiz. **Step 3:** `git add lib/lost-found/actions.ts && git commit -m "feat(f3): lost&found write actions (create/update/delete + lifecycle, KVKK-safe)"`

---

### Task 4: Çoklu görsel upload helper

**Files:** Create `lib/storage/listing-images.ts`

**Interfaces — Produces:** `uploadListingImages(files: File[]): Promise<string[]>` (bare filenames), `LISTING_IMAGE_MAX = 3`, `ALLOWED_LISTING_IMAGE_TYPES`.

- [ ] **Step 1:** avatar deseninden (`lib/storage/avatar.ts` `compressImage`/`uploadAvatar`) türet — client canvas sıkıştırma (MAX_EDGE=1024, JPEG 0.6), her dosya `<uuid>.jpg` olarak `assets` bucket'a, bare filename dizisi döndür:
```ts
import { createClient } from '@/lib/supabase/client';

export const LISTING_IMAGE_MAX = 3;
export const ALLOWED_LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.6;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context oluşturulamadı');
  ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close();
  return new Promise((res, rej) => canvas.toBlob(
    (b) => (b ? res(b) : rej(new Error('Görsel sıkıştırılamadı'))), 'image/jpeg', JPEG_QUALITY));
}

// Sıralı upload — bare filename dizisi (DB images kolonu bunları saklar).
export async function uploadListingImages(files: File[]): Promise<string[]> {
  const supabase = createClient();
  const names: string[] = [];
  for (const file of files.slice(0, LISTING_IMAGE_MAX)) {
    const blob = await compress(file);
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('assets').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    names.push(path);
  }
  return names;
}
```
- [ ] **Step 2:** build temiz. **Step 3:** `git add lib/storage/listing-images.ts && git commit -m "feat(f3): multi-image listing upload helper (assets bucket, ≤3)"`

---

### Task 5: Browse liste sayfası + tile

**Files:** Create `components/lost-found/lf-status-badge.tsx`, `components/lost-found/lf-listing-card.tsx`, `app/(app)/lost-found/browse-list.tsx` (client, sonsuz kaydırma); Modify `app/(app)/lost-found/page.tsx`.

**Interfaces — Consumes:** Task 1 tipleri, Task 2 `browseLostFound`/`PER_PAGE`. **Produces:** `LfStatusBadge`, `LfListingCard`, `BrowseList` (client, ilk sayfa + "daha fazla yükle" ile server action fetch).

- [ ] **Step 1:** `LfStatusBadge` — `status` → renkli rozet (kayip=kırmızı, bulundu=yeşil, cozuldu/pasif=gri), TR label (`LF_STATUS_LABELS`). Küçük rounded pill, F0 token'ları (`bg-primary/…`, `text-*`).
- [ ] **Step 2:** `LfListingCard` — props `LostFoundListing`. `<Link href={/lost-found/${l.id}}>`; foto (`l.images?.[0]` yoksa tip-ikonlu tinted kutu, `<img>` + eslint-disable); sol-üst `LfStatusBadge`; reward rozeti (`l.status==='kayip' && l.rewardOffered` → "Ödül"); alt: başlık (`l.breed ?? petTypeLabel(l.type)`), konum "İl, İlçe", mesafe (`l.distMeters` varsa `${Math.round(m/1000)} km`), createdAt >30 gün → "· eski". 2-col grid'e uygun.
- [ ] **Step 3:** `browse-list.tsx` (`'use client'`) — props ilk `LostFoundListing[]` + bir server action `loadMore(page)` (page arttıkça `browseLostFound`). `useState` items + page; scroll sonu / "Daha fazla" butonu ile fetch; `LfListingCard` grid; boş durum "Sonuç yok" + "İlan ver". Basit "Daha fazla yükle" butonu (IntersectionObserver opsiyonel).
  - Not: server'dan client'a fonksiyon geçmek yerine `loadMore` ayrı bir `'use server'` action olsun (`lib/lost-found/actions.ts`'e `loadMoreBrowseAction(filters, page)` ekle — VEYA page bir route param). Basitlik: `browse-list` filtreleri prop alır, `loadMoreBrowseAction`'ı çağırır.
- [ ] **Step 4:** `app/(app)/lost-found/page.tsx` (değiş) — server component: ilk sayfa `browseLostFound(EMPTY_LF_FILTERS veya persisted, 0)`; başlık + "Harita" linki (`/lost-found/map`) + "İlan ver" (`/lost-found/create`) + `<BrowseList initial={...} />`. (Filtre entegrasyonu Task 6'da bağlanır; bu task filtresiz ilk sayfa + kartları getirir.)
- [ ] **Step 5:** build temiz. **Step 6:** commit (explicit paths) `feat(f3): browse list page + listing card + status badge`.

---

### Task 6: Filtre modeli + kalıcılık + UI

**Files:** Create `lib/lost-found/filters.ts` (encode/decode + localStorage), `components/lost-found/lf-filter-bar.tsx` (client). Wire into `app/(app)/lost-found/page.tsx` / `browse-list.tsx`.

**Interfaces — Produces:** `encodeFilters`/`decodeFilters`, `loadFilterSnapshot(ownerId)`/`saveFilterSnapshot(ownerId, filters)`, `LfFilterBar`.

- [ ] Alanlar spec §6.5: city/district/radiusKm (radius↔city/district karşılıklı dışlama set fn'lerinde), types[], statuses[] (yalnızca kayip/bulundu/cozuldu chip; **pasif yok**), colors[], search (300ms debounce), rewardOnly. localStorage key `lf_filter_snapshot_v1`, owner-stamped (F2 `getCurrentUserProfile` id VEYA client'ta session user id), search HARİÇ, enum `.name`, total decoder (tanınmayan değer düş). `clearAllFilters`. Filtre değişince liste ilk sayfadan yeniden fetch (`browse` veya radius varsa `nearby` + geolocation).
- [ ] Build temiz; commit `feat(f3): lost&found filters + persistence + filter bar`.

---

### Task 7: Benim ilanlarım

**Files:** Create `app/(app)/lost-found/mine/page.tsx`.

- [ ] Server component: `getCurrentUserProfile()` → null redirect; `browseLostFound(EMPTY_LF_FILTERS, 0, me.id)`; `LfListingCard` grid (Task 5); boş durum "Henüz ilanın yok." + "İlan ver". Not: statik `mine` segmenti `[id]`'den önce çözülür.
- [ ] Build temiz; commit `feat(f3): my listings page (/lost-found/mine)`.

---

### Task 8: Paylaşılan ilan formu + create

**Files:** Create `components/lost-found/listing-form.tsx` (client), `app/(app)/lost-found/create/page.tsx`.

**Interfaces — Consumes:** Task 1 tipleri, Task 3 `createListingAction`/`ListingInput`, Task 4 `uploadListingImages`, `TURKEY_CITIES`/`TURKEY_DISTRICTS` (`@/lib/geo/turkey`), F0 geolocation+reverse-geocode deseni (edit-profile'dan). Task 12 `LocationPicker` (opsiyonel; key yoksa gizli). **Produces:** `ListingForm` (create+edit ortak, `mode` + `initial` + `onSubmit` action).

- [ ] Form alanları spec §6.7: foto (1-3, `uploadListingImages`, önizleme, tip/boyut kontrolü), status segmented (kayip/bulundu), il/ilçe select (F0 edit-profile kalıbı) + "Konumumu bul" (geolocation → reverse-geocode il/ilçe + lat/long → WKT), type select, opsiyonel details (breed input, gender chip, color chip `PET_COLORS`, lost_date date input, reward toggle+amount [kayip-only], chip input ≤40), açıklama textarea (≤2000). Konum pin: Task 12 `LocationPicker` (key varsa) → WKT; key yoksa yalnızca geolocation/şehir.
- [ ] `create/page.tsx`: server auth gate + `<ListingForm mode="create" />`. Submit: `uploadListingImages(files)` → `createListingAction({...})` → başarıda `router.push('/lost-found/'+id)`; rate-limit/hata TR mesaj.
- [ ] Build temiz; commit `feat(f3): shared listing form + create page`.

---

### Task 9: Edit sayfası

**Files:** Create `app/(app)/lost-found/[id]/edit/page.tsx`, `app/(app)/lost-found/[id]/edit/edit-form.tsx` (veya `ListingForm mode="edit"`).

- [ ] `edit/page.tsx`: server — `getLostFoundDetail(id)`; sahip değil (`listing.userId !== me.id`) → `redirect('/lost-found/'+id)`; chip: `lost_found_private.select('cip_no')` (owner) hydrate; `<ListingForm mode="edit" initial={listing, cip} />`.
- [ ] Farklar (spec §6.8): status cozuldu/pasif ise kilitli (disable); foto 0 yeni seçilebilir (mevcut `images` korunur — yeni seçilmezse eski dizi gönderilir); pin temizleme açık buton (`clearLocation:true`). Submit → `updateListingAction(id, {...})`.
- [ ] Build temiz; commit `feat(f3): edit listing page (status-lock, chip hydrate, keep-existing-photos)`.

---

### Task 10: Authed detay + sahip aksiyonları

**Files:** Create `app/(app)/lost-found/[id]/page.tsx`, `components/lost-found/owner-actions.tsx` (client).

- [ ] `[id]/page.tsx`: server — `getCurrentUserProfile()` → null redirect; `getLostFoundDetail(id)` null → `notFound()`. Gösterir (spec §6.9): foto galerisi, `LfStatusBadge`, tür/cins(`breed`)/renk/cinsiyet, konum "İl, İlçe" (maskeli), tarih, açıklama, reward, ilan sahibi (F2 `UserAvatar` + username → `/profile/user/${listing.userId}`). `isOwner = listing.userId === me.id`. Owner ise `<OwnerActions listing={} />` + chip (owner-only) göster.
- [ ] `owner-actions.tsx` (`'use client'`): Düzenle (`/lost-found/[id]/edit` link); Sil (onay + `deleteListingAction` → `/lost-found/mine`); status kayip/bulundu → "Ailesine kavuştu" (`markReunitedAction(id, true)`); status pasif → "Yeniden yayınla" (`reactivateListingAction`); (opsiyonel kayip → `bumpActivityAction` "Öne çıkar"). İletişim/DM butonu **yok** (Faz 7, gizli). Optimistic + `router.refresh()`.
- [ ] Build temiz; commit `feat(f3): authed listing detail + owner actions`.

---

### Task 11: Google Maps loader + harita görünümü

**Files:** Add dep `@react-google-maps/api`; Create `lib/maps/google-maps.tsx` (loader/provider + key kontrol), `app/(app)/lost-found/map/page.tsx`, `app/(app)/lost-found/map-view.tsx` (client).

- [ ] **Dep:** `npm install @react-google-maps/api` (package.json + lock commit'e dahil — bu task'ta explicit `git add package.json package-lock.json`). Not: bu tek istisna; diğer commit'ler yalnızca kaynak dosya.
- [ ] `lib/maps/google-maps.tsx`: `MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; `hasMapsKey()` helper. Client `<GoogleMapsProvider>` `useJsApiLoader({ googleMapsApiKey: MAPS_API_KEY ?? '' })`; **key yoksa** provider children yerine `null`/fallback sinyali verir (crash yok).
- [ ] `map/page.tsx`: server — auth gate; `hasMapsKey()` false ise **graceful degrade kartı** ("Harita için yapılandırma gerekli — yönetici Google Maps anahtarını ekleyene kadar liste görünümünü kullan." + `/lost-found` linki), harita yüklemez. Key varsa `<MapView />`.
- [ ] `map-view.tsx` (`'use client'`): `@react-google-maps/api` `GoogleMap`; ilk yüklemede viewport bbox → `lostFoundInBounds` (bir `'use server'` action `mapInBoundsAction(bounds, filters)` üzerinden — client'tan RPC'ye erişim için); kamera hareketi → "Bu alanı ara" butonu (sürekli sorgu YOK); marker durum-renkli (kayip/bulundu), cozuldu yok; marker tık → `/lost-found/[id]`; "Konumumu bul" FAB (geolocation → recenter). Clustering opsiyonel (native `MarkerClusterer`).
- [ ] Build temiz (key olmadan da derlenmeli — `useJsApiLoader` env boşken build'i kırmaz). Commit `feat(f3): google maps loader + lost&found map view (graceful degrade without key)`.

---

### Task 12: Konum pin-picker + create/edit'e bağla

**Files:** Create `components/lost-found/location-picker.tsx` (client); wire into `ListingForm` (Task 8) — geriye dönük düzenleme.

- [ ] `location-picker.tsx`: `hasMapsKey()` false → render `null` (form yalnızca geolocation/şehir kullanır). Key varsa: `GoogleMap` + sabit-merkez pin overlay (harita kayar, pin sabit), "Konumumu bul" FAB (geolocation recenter), "Onayla" → merkez `{lat,lng}` → parent'a WKT `'POINT(lng lat)'`; "Temizle" → parent'a null. Props `{ initial?: {lat,lng} | null; onChange(wkt: string | null) }`.
- [ ] `ListingForm`'a bağla: konum bölümünde `<LocationPicker onChange={setLocationWkt} initial={...} />`; create/edit submit `locationWkt`'yi geçirir; edit'te "Temizle" → `clearLocation:true`.
- [ ] Build temiz; commit `feat(f3): map location pin-picker wired into create/edit`.

---

### Task 13: Nav + profil wiring + final entegrasyon

**Files:** Modify `components/app-shell/nav-items.ts` (gerekiyorsa "Kayıp" zaten `/lost-found`), `app/(app)/profile/page.tsx` (F2 "İlanların … yakında" notunu `/lost-found/mine` linkine çevir).

- [ ] F0 nav'da "Kayıp" → `/lost-found` zaten var (değişiklik gerekmez; doğrula). F2 profil kartındaki deferral notunu "İlanlarım" linkine (`/lost-found/mine`) dönüştür; "kaydettiklerin yakında" kısmı kalır (bookmarks hâlâ deferred). `/lost-found` sayfasına "İlanlarım" + "Harita" + "İlan ver" navigasyonu tam bağlı olsun.
- [ ] Build temiz; commit `feat(f3): wire lost&found nav + profile my-listings link`.
- [ ] **Faz sonu smoke (controller):** logged-out `(app)/lost-found*` → 307; authed (kimlik varsa) browse/create/detail/edit; **harita yalnızca key varsa** — key yoksa graceful-degrade kartı doğrulanır, marker/pin-picker runtime **doğrulanamaz (fail-loud: key yok)**.

---

## Self-Review
**Spec coverage:** §8 kriter → task: 1(browse)→T5/T6; 2(filtre kalıcı)→T6; 3(create)→T3/T4/T8; 4(edit)→T9; 5(detay+PII)→T2/T10; 6(mine)→T7; 7(sil/reunited/reactivate)→T3/T10; 8(harita+degrade)→T11; 9(konum)→T8/T12; 10(build+no select*)→her task; 11(deferral fail-loud)→T10 (DM gizli)+spec §2. Kapsandı.
**Placeholder:** hard kod parçaları somut; UI task'ları (5-10) kesin alan/RPC/prop + iskelet verir, stil mevcut sayfalardan — implementer pattern'i izler, review gate sapmayı yakalar.
**Type consistency:** `LostFoundListing`/`LfFilters`/`LfListRow`/`ListingInput` T1/T3'te tanımlı, T2/T5-T12'de aynı adla tüketilir. `.returns<LfListRow[]>()` deseni tüm okumada tutarlı. `locationWkt` `'POINT(lon lat)'` her yazımda aynı.
