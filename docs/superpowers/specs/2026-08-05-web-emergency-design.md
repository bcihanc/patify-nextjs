# Web Emergency (Acil) — Design Spec

**Date:** 2026-08-05
**Program:** Patify mobil→web parite. Bu faz = **Emergency** (mobil nav tab 2, "Acil").
**Branch:** `feat/web-emergency` · base `main@fee67b0`

## 1. Overview / Goal

Mobil "Emergency" özelliğini web'e taşı: **sokaktaki tehlikedeki hayvanlar için topluluk müdahale panosu**. Kullanıcı bir vaka bildirir (fotoğraf + gerçek GPS konumu), başka bir gönüllü **üstlenir (claim)**, kurtarma sonrası **çözer (resolve)**. Bildiren ↔ üstlenen kurtarmayı DM ile koordine eder.

Emergency, Lost&Found ve Adoptions'ın yakın klonudur; her dosya bir F3/Adoptions şablonunu birebir aynalar + Emergency delta'larını uygular.

## 2. Scope & Deferrals

**KAPSAM (bu faz):**
- Browse (liste + filtre bar), nearby (radius), harita (in-bounds, graceful-degrade), detay, create (login-gated), nav'a Emergency ekleme.
- Lifecycle: **claim** (üstlen) + **resolve** (çözüldü).

**ERTELENDİ (fail-loud, kendi fazlarında):**
- **DM "Mesaj" CTA** → Chats fazına bağlı (`findOrCreateDirectRoom`, `can_dm` web'de henüz yok). Detayda render EDİLMEZ; kod yorumu + bu spec notu bırakılır.
- **Report "..." menüsü** → Moderasyon fazına bağlı (`reports` tablosu/UI web'de henüz yok). Render EDİLMEZ.
- **Nearby-emergency push tercihleri** (`upsert_nearby_emergency_push_pref`) → Notifications/push fazına bağlı.

**KAPSAM DIŞI (mobilde de yok):** edit, delete, "benim vakalarım" (mine). Mobilde emergency için ne edit sayfası ne delete özelliği ne de profil→vakalarım girişi var — eklenmez.

## 3. Data model — `lib/emergency/types.ts`

Enum'lar (DB etiketleriyle **byte-exact**, `.name` ↔ DB):

```ts
export type EmergencyKind = 'yarali' | 'tehlikede' | 'istismar' | 'olu';
export type EmergencyStatus = 'acik' | 'ustlenildi' | 'cozuldu' | 'pasif';

export const EMERGENCY_KIND_LABELS: Record<EmergencyKind, string> = {
  yarali: 'Yaralı', tehlikede: 'Tehlikede', istismar: 'İstismar', olu: 'Ölü',
};
export const EMERGENCY_STATUS_LABELS: Record<EmergencyStatus, string> = {
  acik: 'Açık', ustlenildi: 'Üstlenildi', cozuldu: 'Çözüldü', pasif: 'Pasif',
};
```

`PetType`, `LfUserSummary`, `PET_TYPE_LABELS`, `petTypeLabel` **`@/lib/lost-found/types`'tan yeniden kullanılır** (redefine YOK — Adoptions kalıbı).

`EmergencyListing` (camelCase, UI tipi):
```
id, createdAt, reporterUserId, reporter: LfUserSummary | null,
kind: EmergencyKind, petType: PetType, description: string | null,
photoUrl: string (full URL), city: string | null, district: string | null,
status: EmergencyStatus, claimedBy: string | null, claimedAt: string | null,
resolvedAt: string | null, lat: number | null, long: number | null,
distMeters: number | null
```

`EmergencyRow` (snake_case, RPC row — mobil `field_rename: snake` ile eşleşir):
```
id, created_at, reporter_user_id, reporter: {id, username, profile_photo, created_at} | null,
kind, pet_type, description, photo_url, city, district, status,
claimed_by, claimed_at, resolved_at, lat, long, dist_meters
```
Not: `photo_url` **çıplak dosya adı** — map sırasında assets bucket public URL'ine çevrilir.

`EmergencyFilters`:
```
kinds: EmergencyKind[], statuses: EmergencyStatus[],
city: string | null, district: string | null, radiusKm: number | null, search: string
```
`EMPTY_EMERGENCY_FILTERS` = hepsi boş/null, search ''. `PER_PAGE = 10` (types.ts'te — read.ts + client ortak).

## 4. Read layer — `lib/emergency/read.ts`

RPC sarmalayıcılar, hepsi `.returns<EmergencyRow[]>()`. RPC adları/param'ları **mobil `emergency_repo.dart` ile byte-exact**:

- `browseEmergency(filters, page, reporterUserId?)` → `browse_emergency_cases({limits, offsets, city_param, district_param, kind_param, status_param, reporter_user_id_param, search_param})`
- `nearbyEmergency(lat, long, filters, page)` → `nearby_emergency_cases({lat_param, long_param, limits, offsets, max_distance_m_param, kind_param, status_param})` (max_distance_m_param = radiusKm*1000)
- `emergencyInBounds(bounds, filters)` → `emergency_cases_in_bounds({min_lat, min_long, max_lat, max_long, kind_param, status_param})` — **city/district/search KABUL ETMEZ** (Adoptions in_bounds kalıbı), limits 500.
- `getEmergencyById(id)` → `get_emergency_case_by_id({case_id})` → liste; 0 satır → null. Anon-open.

`mapRowToEmergency(r)`:
- `photo_url` çıplak ad → `${SUPABASE_URL}/storage/v1/object/public/assets/${f}`.
- `reporter` nested → `{id, username, profilePhoto}` (Adoptions `user` kalıbı) veya null.
- `lat/long` **MASKESİZ** (delta: owner-aware maskeleme YOK).
- `kind_param`/`status_param`: boş dizi → null (`arrParam` helper).

## 5. Write layer — Server Actions `lib/emergency/actions.ts` (`'use server'`)

`EmergencyInput = { kind, petType, description?, photoUrl (çıplak ad), locationWkt, city, district? }`.

- **`createEmergencyAction(input)`**: `getUser()` → yoksa `{error:'Oturum bulunamadı.'}`. `kind`/`petType`/`city` zorunlu → yoksa `{error:'Zorunlu alanlar eksik.'}`. `locationWkt` **ZORUNLU** (emergency_cases.location NOT NULL) → yoksa `{error:'Vakanın konumunu belirlemelisin.'}`. INSERT açık kolon listesi: `reporter_user_id: user.id` (session-authoritative), `kind, pet_type, description (temiz), photo_url, location: locationWkt, city (temiz), district (temiz)`. `.select('id')` — **location ASLA projeksiyona konmaz**. Rate-limit sentinel `emergency_create_rate_limit` → mesaj-only match → TR mesaj. Dönüş `{ok:true, id}`.
- **`claimEmergencyAction(id)`**: `getUser()` gate. `.rpc('claim_emergency_case', {case_id:id})` → `{ok:true, claimed: res===true}`. `claimed===false` = yarışı kaybetti (hata DEĞİL) — UI ayrı toast gösterir.
- **`resolveEmergencyAction(id)`**: `getUser()` gate. `.rpc('resolve_emergency_case', {case_id:id})` → `{ok:true, resolved: res===true}`. `resolved===false` = conflict.
- **Client action'ları**: `loadBrowseEmergencyAction(filters, page)`, `loadNearbyEmergencyAction(lat, long, filters, page)`, `emergencyInBoundsAction(bounds, filters?)` — read katmanını çağırır (client → server-only RPC erişimi için).

Description **sanitize** edilir (basit trim + boş→null; React render escape eder, XSS yok — Adoptions `clean()` kalıbı).

## 6. UI — `app/(app)/emergency/*` + `components/emergency/*`

Rota grubu `(app)` (login-gated — web-wide kalıp; §9). Sayfalar:

- **`/emergency` (`page.tsx` + `browse-list.tsx`)**: server page filtreleri okur (localStorage değil — client tarafı persist eder), `EmergencyBrowseList` client bileşeni. Filtre bar: kind[] (çoklu), status[] (çoklu), city, district, search, radiusKm. localStorage persistence (Adoptions `adoption-filter-bar` kalıbı). Sonsuz kaydırma (PER_PAGE). Radius aktif + geolocation alınırsa `loadNearby`, aksi halde `loadBrowse`. Kart grid → `EmergencyCard`.
- **`/emergency/map` (`map/page.tsx` + `map-view.tsx`)**: Google Maps, key yoksa graceful-degrade kartı (L&F/Adoptions `maps-provider` kalıbı). `emergencyInBoundsAction` ile viewport + "Bu alanı ara". Marker tap → detay.
- **`/emergency/create` (`create/page.tsx`)**: login-gated. Form (`EmergencyForm`): fotoğraf (tam 1, zorunlu, video yok), kind (zorunlu, 2×2 segmented), konum (city zorunlu + district + **harita pini zorunlu** — maskesiz koordinat nearby/harita için gerekli), pet type (zorunlu), açıklama (opsiyonel). Pin yoksa submit bloklanır (`{error}` toast) — asla sessiz canlı-GPS'e düşme. Başarıda `/emergency/{id}`'e `replace`.
- **`/emergency/[id]` (`[id]/page.tsx`)**: `getEmergencyById`, yoksa `notFound()`. Fotoğraf, kind+status rozetleri, pet type başlık, konum metni (city · district), açıklama, **"Haritada gör"** (lat/long varsa — MASKESİZ, "yaklaşık" notu YOK). Aksiyon bar (`EmergencyActions` client bileşeni): claim/resolve gated (§7). **DM ve Report CTA render EDİLMEZ** (ertelendi, §2).
- **Badges** (`components/emergency/`): `EmergencyKindBadge`, `EmergencyStatusBadge` (L&F `lf-status-badge` kalıbı; renkler: yarali/tehlikede/istismar uyarı tonu, olu nötr; acik vurgulu, ustlenildi info, cozuldu başarı, pasif nötr).
- **Nav**: `nav-items.ts`'e Emergency, Sahiplen ile Sohbet arasına: `{ href:'/emergency', label:'Acil', icon: Siren }` (lucide `Siren`).

## 7. Gating rules (mobil `emergency_detail_page.dart` ile birebir)

`EmergencyActions` client bileşeni, `currentUserId` (server'dan prop) ile:
- **canClaim** = `status==='acik' && claimedBy==null && reporterUserId !== currentUserId`. (Buton logged-out kullanıcıya da görünür; tıklama login'e yönlendirir — web'de logged-out zaten `(app)`'e giremez, yani pratikte hep logged-in; yine de reporter kontrolü şart.)
- **canResolve** = `(isReporter || isClaimer) && status !== 'cozuldu'`.
- **canDm** (ERTELENDİ) = `claimedBy!=null && (isReporter ? claimedBy : isClaimer ? reporterUserId : null)`. Chats fazına kadar render yok.
- **Report** (ERTELENDİ) = non-reporter. Moderasyon fazına kadar render yok.
- Hiçbiri geçerli değilse aksiyon bar boş (render yok).

claim başarı → toast "Vakayı üstlendin"; claimed=false → "Bu vaka zaten üstlenilmiş". resolve başarı → "Vaka çözüldü olarak işaretlendi"; resolved=false → "İşlem çakıştı, tekrar dene". Mutasyon sonrası `router.refresh()` ile detay tazelenir.

## 8. KVKK / Security

- **Konum MASKESİZ** (delta): emergency lat/long ham döner ve haritada gerçek konum gösterilir — sokak hayvanının korunacak konutu yok. L&F/Adoptions'ın owner-aware CASE maskesi burada YOK.
- **Reads RPC-only**: `.select('*')` YASAK (emergency_cases.location SELECT prod'da revoke → 42501). Konum yalnızca `get_emergency_case_by_id`/browse/nearby RPC'lerinden lat/long olarak gelir (ST_Y/ST_X).
- **Create**: `.select('id')` — location asla projeksiyona konmaz. `reporter_user_id` **session-authoritative** (getUser'dan, client'tan değil).
- claim/resolve yetkisi DB RPC'lerinde (SECURITY DEFINER) — web sadece çağırır.

## 9. Constraints (F0-Adoptions'tan taşınır)

- main'e ASLA commit; push/deploy ASLA; **migration YOK** (emergency_cases + tüm RPC'ler canlı DB'de var, mobil çağırıyor).
- Reads = RPC `.returns<EmergencyRow[]>()`. `database.types.ts` **bilinçli bayat** — bu RPC'ler orada yok ama canlı DB'de var (mobil kanıt). Bayat LSP (2307/2724) = build/tsc otoritatif.
- Writes = açık kolon; `.select('*')` YASAK; WKT **lon-first** `POINT(long lat)`.
- Maps key = kullanıcı sağlar; key yoksa graceful-degrade (kod hazır).
- **Login-gated browse** `(app)` altında (web-wide kalıp; L&F/Adoptions da öyle). Mobil guest-browse'a izin verir; bu ayrım Emergency'ye özel değil, önceden var olan web kararı — programda sonra topluca ele alınabilir, bu fazda değiştirilmez.
- Test runner yok → `npm run build` / `tsc --noEmit` otoritatif.

## 10. Success criteria

1. `/emergency` filtre bar (kind/status çoklu + city/district/search/radius) + localStorage persist + sonsuz kaydırma çalışır; radius+geolocation → nearby.
2. `/emergency/map` key yoksa graceful-degrade, key varsa marker + "Bu alanı ara".
3. `/emergency/create`: fotoğraf(1)/kind/city/petType + harita pini zorunlu; pin yoksa submit bloklanır; başarıda detaya yönlenir; rate-limit mesajı.
4. `/emergency/[id]`: vaka render + maskesiz "Haritada gör" + claim/resolve gating doğru; DM/Report render EDİLMEZ.
5. createEmergencyAction session-authoritative, `.select('id')`, location asla projeksiyona konmaz, WKT lon-first.
6. claim/resolve RPC'leri; false dönüş = conflict (hata değil), ayrı toast.
7. Enum'lar byte-exact; PetType/LfUserSummary reuse (redefine yok).
8. Nav'a Acil eklenir (Sahiplen↔Sohbet arası).
9. `npm run build` temiz; `.select('*')` yok; no `database.types.ts` değişikliği.
10. DM/Report/push ertelemeleri kod yorumu + spec ile fail-loud işaretli.
