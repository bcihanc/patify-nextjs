# F3 — Lost & Found (Tam: browse, map, create, edit, benim ilanlarım) — Tasarım

- **Tarih:** 2026-08-04
- **Program fazı:** Faz 3 — *Lost & Found (tam)* (bkz. F0 spec §0)
- **Durum:** Onaylandı (brainstorming) → plan yazımına hazır
- **Repo:** `patify-nextjs` (Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`)
- **Kardeş kaynak:** `/Users/cihan/IdeaProjects/patify` (Flutter mobil — `lib/features/lost_found/`)

---

## 0. Program bağlamı

Program: mobildeki tüm özellikleri web'e taşımak (F0 §0). Web ile mobil aynı Supabase projesini (`uynwrqccvfcwunrzoxva`) paylaşır. Lost & Found ürünün **birincil modülü** ve paylaşılabilir link'lerin kaynağı.

**Kullanıcı kararları (2026-08-04):**
- **Tek döngüde tam kapsam** (harita dahil) — F3a/F3b'ye bölünmedi.
- **Harita = Google Maps JS** (mobil parite; `google_maps_flutter` karşılığı). **API key + billing kullanıcı tarafından sağlanır** — key oluşturma/billing bana yasak.

**F0/F2'den devralınan (tekrar yapılmaz):** `(app)` gate zinciri + AppShell, tema, `avatarUrl`/`uploadAvatar` (foto sıkıştırma deseni), `getCurrentUserProfile`, geolocation + `reverse-geocode` edge fn (F0 edit-profile "konumumu bul"), TR il/ilçe listeleri (`lib/geo/turkey.ts`), `UserAvatar`/profil bileşenleri (F2), `lib/lost-found.ts` (mevcut public detay RPC deseni).

**Mevcut web LF yüzeyi:** public detay `app/(public)/lost-found/item/[id]` + OG image + `/gordum` anonim sighting formu; `lib/lost-found.ts` (`get_lost_found_by_id` RPC, `.returns<>()` deseni). Authed `/lost-found` = placeholder.

---

## 1. Hedef ve kilitlenen kararlar

**Hedef:** Web'e tam LF lifecycle'ını getirmek — authed browse (liste + filtre + arama), harita, ilan oluştur/düzenle, "benim ilanlarım", uygulama-içi detay + sahip aksiyonları.

| Karar | Seçim |
|---|---|
| Kapsam | Tek döngü, tam (browse+filter+map+create+edit+my-listings+detail+owner-actions) |
| Harita | Google Maps JS (`@react-google-maps/api`), env key, key yoksa graceful degrade |
| Okumalar | **Sadece RPC** (`browse_lost_found`/`nearby_lost_found`/`lost_found_in_bounds`/`get_lost_found_detail`) — `.returns<Shape[]>()` deseni; `.from('lost_found').select('*')` **YASAK** (prod'da 42501, `location` SELECT'i revoke) |
| Yazımlar | Tablo INSERT/UPDATE/DELETE (Server Action) — açık kolon listesi; `cip_no` → ayrı `lost_found_private` |
| Konum | Zorunlu şehir; opsiyonel WKT nokta (`'POINT(lon lat)'`) — geolocation "konumumu bul" VEYA harita pin-picker |
| Foto | `assets` bucket, client sıkıştırma (avatar deseni), min 1 / max 3 (create) |
| Silme | **Hard DELETE** (soft `deleted_at` DEĞİL — o admin-only) + best-effort görsel temizliği |
| PII/KVKK | Maskeli `public_location` (grid ~100-150m) okunur; `cip_no` owner-only; `phone_number` hiç yazılmaz |

---

## 2. Kapsam sınırları

**IN:**
1. Domain/tip katmanı (enum'lar + `pasif`, renkler, reward, filtre tipleri, RPC row tipleri).
2. Read layer: browse / nearby / in_bounds / detail RPC wrapper'ları + row→camelCase mapping (maskeli koordinat, user özeti, images→URL).
3. Write layer (Server Action): create / update / delete(hard) / lifecycle (mark_reunited, reactivate, bump).
4. Çoklu görsel upload helper (assets, 1-3).
5. Browse liste sayfası `/lost-found` (placeholder → gerçek) + tile + durum/reward rozeti + sonsuz kaydırma (sayfa 10) + boş durumlar.
6. Filtre UI + kalıcılık (localStorage snapshot, owner-stamped, arama hariç, radius↔şehir karşılıklı dışlama).
7. "Benim ilanlarım" `/lost-found/mine` (browse `owner_user_id_param`) + F2 profil kartından link.
8. Create form `/lost-found/create`.
9. Edit form `/lost-found/[id]/edit` (durum-kilidi cozuldu/pasif; mevcut foto koruma; chip hydration).
10. Uygulama-içi authed detay `/lost-found/[id]` + sahip aksiyonları (düzenle/sil/reunited/reactivate).
11. Google Maps: loader (env key) + harita görünümü `/lost-found/map` (in_bounds bbox + "bu alanı ara" + markerlar + clustering).
12. Konum pin-picker bileşeni (sabit-merkez pin) — create/edit'e bağlı.

**OUT (ertelenen — fail-loud):**
- **Matches bölümü** (`match_lost_found`/`chip_matches`) → sonraki eşleştirme konusu.
- **Rebroadcast "duyur"** (edge fn `rebroadcast-lost-found`, 24h cooldown) → sahip enhancement.
- **Sighting timeline** (authed detayda sahip görülme incelemesi) → anonim `/gordum` yazımı zaten var; sahip incelemesi enhancement.
- **İletişim/DM** (detaydan mesaj) → Faz 7 (Chats).
- **Poster/afiş üretimi + paylaşım seçici** → sonraki.
- **Yakınlık push tercihleri** → Faz 8.
- **Gender filtresi** → mobilde yok, eklenmez (YAGNI).

---

## 3. Marka / tema
Yeni token yok (F0 teması). Görsel bilgi mimarisi mobil LF liste/detay/create'i izler.

---

## 4. Rota ağacı

Public LF (mevcut) korunur; F3 authed LF'yi `(app)` altında ekler:
```
app/(app)/lost-found/
  page.tsx                # DEĞİŞ: placeholder → browse liste + filtre
  map/page.tsx            # YENİ: harita görünümü (Google Maps)
  mine/page.tsx           # YENİ: benim ilanlarım
  create/page.tsx         # YENİ: ilan oluştur
  [id]/page.tsx           # YENİ: authed detay + sahip aksiyonları
  [id]/edit/page.tsx      # YENİ: ilan düzenle
app/(public)/lost-found/item/[id]/   # MEVCUT public shareable detay — dokunulmaz
```
Kenar durumlar: `[id]` bulunamaz → `notFound()`; edit/detay sahip-değil → detayda sahip aksiyonları gizlenir, edit'e sahip-değil erişimi → `/lost-found/[id]`'ye redirect.

---

## 5. Veri katmanı

### 5.1 Backend gerçeği (mevcut; migration YOK)
- **Tablo `lost_found`** kolonları (okuma RPC'lerden, yazımda açık liste): `id, created_at, updated_at, deleted_at, user_id, type (pet_type), breed, color, gender (pet_gender), city, district, location (geography Point — SELECT revoked), public_location (grid-maskeli), lost_date (date), status (lf_status), description, images (text[] bare filenames), reports_count, sightings_count, last_rebroadcast_at, reward_offered, reward_amount, lifecycle_last_activity_at, lifecycle_reminder_stage`.
- **`lost_found_private`** (owner-only): `lost_found_id PK, phone_number (yazılmaz), cip_no`.
- **Enum'lar:** `lf_status{kayip,bulundu,cozuldu,pasif}`, `pet_type{dog,cat,bird,rabbit,hamster,fish,turtle,reptile,other}`, `pet_gender{male,female}`. Renk: `text`, `kPetColors=['beyaz','siyah','gri','kahverengi','sari_krem','kizil_turuncu','alacali']`.

### 5.2 Okuma RPC'leri (`.rpc(name, params).returns<Row[]>()`)
Hepsi SECURITY DEFINER, `deleted_at IS NULL`, `status<>'pasif' OR user_id=auth.uid()`, blok filtreli; koordinat owner→raw / diğer→maskeli. **Row `select('*')` ile genişletilmez.**

- **`browse_lost_found(city_param text, district_param text, type_param pet_type[], status_param lf_status[], owner_user_id_param uuid, limits int=10, offsets int=0, search_param text, color_param text[], reward_only bool=false)`** → `RETURNS TABLE(id, created_at, user_id, "user" json{id,username,profile_photo,created_at}, type, breed, color, gender, city, district, status, lost_date, description, images, lat, long, dist_meters(null), reward_offered, reward_amount)`. Order `created_at DESC`. anon+authenticated. Sayfa=10, `offsets=page*limits`.
- **`nearby_lost_found(lat_param float8, long_param float8, limits int, offsets int, city_param, district_param, type_param, status_param, owner_user_id_param, search_param, color_param, reward_only bool=false, max_distance_m_param int=null)`** → browse ile aynı + `dist_meters` dolu. KNN sıralı. `location NOT NULL` gerekir. `max_distance_m_param` server'da 1000-50000m clamp.
- **`lost_found_in_bounds(min_lat float8, min_long float8, max_lat float8, max_long float8, city_param, district_param, type_param, status_param, owner_user_id_param, search_param, limits int=100, color_param)`** → aynı şekil (reward_only param YOK). Bbox filtre. Order `created_at DESC`. Harita sorgusu.
- **`get_lost_found_detail(p_id uuid)`** → tek satır, **authenticated-only** (owner kimliği + maskeli koordinat). anon değil.
- (mevcut) **`get_lost_found_by_id(p_id uuid)`** → anon-open, PII-minimal — public shareable sayfa kullanır, dokunulmaz.

**Benim ilanlarım:** `browse_lost_found(owner_user_id_param=<me>, status_param=null, ...)` diğer filtreler boş.

### 5.3 Yazma yolu (Server Action, session-authoritative)
- **create:** `INSERT INTO lost_found (açık kolon listesi)` — `user_id=session`, `type, city, status` zorunlu; opsiyonel breed/color/gender/district/description/images/lost_date/reward_offered/reward_amount; `location` varsa WKT `'POINT(<lon> <lat>)'`. `cip_no` varsa **ayrı** `.from('lost_found_private').upsert({lost_found_id, cip_no})` — bu yazım başarısız olursa ilan zaten oluştu, ayrı hata. Metin sanitize (description/city/district). **Rate-limit:** trigger ≥10/saat → SQLSTATE `23514` msg `lost_found_create_rate_limit` → kullanıcıya ayrı TR mesaj.
- **update:** aynı; `user_id` payload'dan çıkarılır; `location` null'lamak için açık `clearLocation` bayrağı (omit=dokunma).
- **delete:** **hard DELETE** `WHERE id=... AND user_id=session`; sonra best-effort `assets` bucket görsel temizliği.
- **lifecycle:** `bump_lost_found_activity(p_listing_id)`, `reactivate_lost_found(p_listing_id)`, `mark_reunited(p_listing_id, p_via_patify bool, p_helper_user_id uuid=null)` — hepsi owner-check server'da.
- **cip okuma (edit):** authenticated `.from('lost_found_private').select('cip_no').eq('lost_found_id',id).maybeSingle()`.

### 5.4 Görsel upload
`lib/storage/listing-images.ts` — avatar deseni (canvas sıkıştırma → JPEG), `assets` bucket, `<uuid>.jpg`, bare filename döndürür. Create min 1/max 3; edit mevcut set korunur, yeni seçim ≤3. Okuma: bare filename → `avatarUrl` benzeri public URL.

---

## 6. Özellik spec'leri (özet)

### 6.1 Domain (`lib/lost-found/types.ts` + mevcut `lib/lost-found.ts` güncelle)
`LfStatus` = `'kayip'|'bulundu'|'cozuldu'|'pasif'` (pasif eklenir). `PetGender='male'|'female'`. `PetColorKey` = 7 renk + TR label map. Reward. Tam `LostFoundListing` (id, type, breed, color, gender, city, district, status, lostDate, description, images[], lat, long, distMeters, rewardOffered, rewardAmount, user{id,username,profilePhoto}, createdAt, userId). Filtre tipi `LfFilters`.

### 6.2 Read layer (`lib/lost-found/read.ts`)
`browseLostFound(filters, page)`, `nearbyLostFound(lat,long,filters,page)`, `lostFoundInBounds(bounds, filters)`, `getLostFoundDetail(id)` — her biri RPC çağrısı + row→`LostFoundListing` mapping (images→URL, lat/long maskeli olduğu gibi, user özeti). Hata → boş dizi/null + `console.error`.

### 6.3 Write layer (`app/actions.ts` ekleme veya `lib/lost-found/actions.ts`)
`createListingAction`, `updateListingAction`, `deleteListingAction`, `markReunitedAction`, `reactivateListingAction`, `bumpActivityAction` — dönüş `{ok:true, id?}|{error}`; rate-limit sentinel ayrı TR mesaj.

### 6.4 Browse liste `/lost-found`
Sunucu ilk sayfa (browse veya nearby), client sonsuz kaydırma. Tile: foto (yoksa tip-ikon), sol-üst durum rozeti, reward rozeti (kayip&reward), konum satırı "İl, İlçe", mesafe (nearby), ">30 gün · eski". Boş durumlar (hata / sıfır-sonuç + filtre temizle). "İlan ver" CTA → `/lost-found/create`. "Harita" linki → `/lost-found/map`.

### 6.5 Filtre + kalıcılık (`lib/lost-found/filters.ts` + client)
Alanlar: city, district, radiusKm (radius↔city/district dışlama), type[], status[] (pasif UI'da yok), color[], search (300ms debounce), rewardOnly. localStorage `lf_filter_snapshot_v1` (owner-stamped, search hariç, enum `.name`, total decoder). `clearAllFilters`.

### 6.6 Benim ilanlarım `/lost-found/mine`
`browseLostFound({ownerUserId: me})` — aynı tile grid; boş durum "Henüz ilanın yok." + "İlan ver". F2 profil kartındaki "İlanların … yakında" notu bu sayfaya link olur.

### 6.7 Create `/lost-found/create`
Zorunlu: foto(1-3), status(kayip/bulundu segmented), city (il/ilçe select), type. Opsiyonel: breed, gender, color, lost_date, reward (kayip-only toggle+amount), chip (≤40), açıklama (≤2000), konum (geolocation "konumumu bul" → lat/long VEYA harita pin-picker → WKT). Submit → `createListingAction` → başarıda `/lost-found/[id]`.

### 6.8 Edit `/lost-found/[id]/edit`
Create alanları + farklar: status cozuldu/pasif ise kilitli; foto 0 yeni seçilebilir (mevcut korunur); chip inline (`lost_found_private`'dan hydrate); pin temizleme açık buton (`clearLocation`). Sahip değilse redirect.

### 6.9 Authed detay `/lost-found/[id]`
`getLostFoundDetail(id)`. Gösterir: foto galerisi, durum rozeti, tür/cins/renk/cinsiyet, konum (maskeli), tarih, açıklama, reward, ilan sahibi (F2 `UserAvatar` → `/profile/user/[ownerId]`). Sahipse: Düzenle/Sil/(kayip→)Duyar? hayır (deferred)/(kayip→cozuldu) "Ailesine kavuştu" (mark_reunited)/(pasif→) "Yeniden yayınla" (reactivate). Sahip-only: chip. İletişim/DM butonu → Faz 7 (deferred, "yakında" değil, gizli).

### 6.10 Harita `/lost-found/map` + pin-picker
- **Loader** (`lib/maps/google-maps.ts` + client `<MapsProvider>`): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` okur. **Key yoksa:** harita sayfası "Harita için yapılandırma gerekli" bilgilendirme kartı gösterir (crash yok); pin-picker create/edit'te gizlenir, konum yalnızca geolocation/şehir ile alınır.
- **Harita görünümü:** ilk yüklemede viewport bbox → `lostFoundInBounds`; kamera hareketinde "Bu alanı ara" butonu (sürekli sorgu YOK); cozuldu her zaman çıkarılır; marker durum-renkli (kayip=kırmızı, bulundu=yeşil), tıklama → detay. Clustering (Google native).
- **Pin-picker:** sabit-merkez pin (harita kayar, pin sabit overlay), "Konumumu bul" FAB, onay → merkez `LatLng` → WKT (`'POINT(lon lat)'`). İptal → null.

---

## 7. Güvenlik & gizlilik (KVKK)
1. **`select('*')` yasak** — okumalar RPC, yazımlar açık kolon listesi (aksi 42501).
2. **Maskeli koordinat:** non-owner'a RPC'nin döndürdüğü `lat/long` (grid-maskeli) kullanılır; raw `location` asla okunmaz/türetilmez.
3. **`cip_no` owner-only** (`lost_found_private`); `phone_number` hiç yazılmaz.
4. **Yazım session-authoritative:** `user_id` daima `getUser()`'dan; create/update/delete/lifecycle sahip-check.
5. **pasif owner-only, blok filtreli** — mevcut RPC'ler bunu zorlar; yeni okuma yolu eklenmez.
6. Metin sanitize (description/city/district) + XSS: tüm kullanıcı metni JSX escape.
7. **Rate-limit** sentinel ayrı ele alınır.

---

## 8. Başarı kriterleri
1. `/lost-found` gerçek browse listesi: filtre/arama/sonsuz kaydırma çalışır; boş/hata durumları TR.
2. Filtreler localStorage'da kalıcı (owner-stamped, arama hariç); radius↔şehir dışlaması doğru.
3. `/lost-found/create` zorunlu {foto,status,city,type} ile ilan oluşturur; DB satırı + görsel(ler) `assets`'e yazılır; başarıda detaya gider; rate-limit ayrı mesaj.
4. `/lost-found/[id]/edit` sahibi düzenler; cozuldu/pasif'te status kilitli; chip hydrate; mevcut fotolar korunur; sahip değilse redirect.
5. `/lost-found/[id]` authed detay owner kimliği + maskeli konum + reward gösterir; **PII sızıntısı yok** (`get_lost_found_detail`); sahip aksiyonları yalnızca sahibe.
6. `/lost-found/mine` yalnızca kullanıcının ilanları.
7. Sil → hard delete + görsel temizliği; mark_reunited → cozuldu; reactivate → kayip.
8. `/lost-found/map` (key varsa) bbox ilanlarını marker'la gösterir; "bu alanı ara"; cozuldu haritada yok; marker→detay. **Key yoksa graceful degrade** (crash yok).
9. Konum: create/edit'te şehir zorunlu, WKT nokta opsiyonel (geolocation veya pin); pin temizlenebilir.
10. `npm run build` temiz (TS strict). `select('*')` hiçbir yerde yok.
11. Ertelenen yüzeyler (matches, rebroadcast, sighting-review, DM, poster) sessizce eksik değil — spec'te ve UI'da uygun şekilde işaretli/gizli.

---

## 9. Global Constraints
- **Dil:** TR-only.
- **TS strict:** `noUncheckedIndexedAccess` (`rows[0]!` + disable comment), `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- **Backend değişmez:** migration YOK; mevcut tablo/RPC'lere karşı UI. Canlı DB yazımı gerçek uygulama yazımıdır (migration/şema değişikliği değil).
- **Okuma = RPC (`.returns<Shape[]>()`), yazım = açık kolon listesi.** `.select('*')` LOST_FOUND'da YASAK.
- **Supabase client:** Server → `await createClient()`; Client → `createClient()`.
- **PII:** maskeli koordinat, cip_no owner-only, phone yazılmaz, `get_lost_found_by_id` (public) dokunulmaz.
- **Görsel:** `<img>` + `eslint-disable no-img-element` (F0 deseni); assets bucket bare filename.
- **Harita:** yeni dependency `@react-google-maps/api`; `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env; **key yoksa graceful degrade, crash yok.** Key/billing kullanıcı sağlar.
- **WKT:** listing `location` = `'POINT(lon lat)'` (lon önce); sighting EWKT'siyle karıştırma.
- **Enum `.name`** DB label ile birebir (`kayip`, `dog`, `male`, renk anahtarları) — çeviri UI katmanında.

---

## 10. Test / doğrulama
Test runner yok. Doğrulama:
- **`npm run build`** — TS/ESLint kapısı (otoritatif).
- **Cihaz/smoke (Chrome MCP):** logged-out `(app)/lost-found*` → 307/auth/login; authed (kimlik varsa) browse render + create akışı + detay + edit. **Google Maps runtime yalnızca key varsa** — key yoksa graceful-degrade kartı doğrulanır; harita marker/pin-picker runtime doğrulaması **key gerektirir (fail-loud: doğrulanamadı, key yok)**.
- **Canlı DB:** create/edit/delete gerçek satır yazar (mevcut tabloya normal uygulama yazımı; migration değil) — test kullanıcısıyla UI üstünden. Rate-limit ve KVKK maskesi RPC/trigger'da; web yalnızca tüketir.

> **Harici bağımlılık (fail-loud):** Google Maps runtime'ı `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` gerektirir. Key + billing **kullanıcı tarafından** sağlanır (key oluşturma/billing asistana yasak). Key eklenene kadar harita görünümü ve pin-picker render OLMAZ; kod graceful degrade eder, build temiz kalır.
