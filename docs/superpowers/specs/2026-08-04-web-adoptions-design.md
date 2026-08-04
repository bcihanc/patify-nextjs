# Adoptions (Sahiplendirme) — Tasarım (Çekirdek)

- **Tarih:** 2026-08-04
- **Program fazı:** Program §0 Faz 6 (Adoptions). **Faz 4 (Posts) ve Faz 5 (Discussions) atlandı** — mobilde FOCUS-COLLAPSE ile nav'dan kaldırılmışlar (kullanıcı kararı, 2026-08-04). Bu yüzden yapılan sıra: F0 → Faz 2 → Faz 3 (LF) → **Adoptions**.
- **Durum:** Onaylandı (brainstorming) → plan yazımına hazır
- **Repo:** `patify-nextjs` · **Kardeş kaynak:** `/Users/cihan/IdeaProjects/patify` (`lib/features/adoptions/`)

---

## 0. Bağlam ve kapsam kararı

Adoptions, **Lost & Found (F3) ile yapısal olarak neredeyse birebir**: aynı RPC-only okuma deseni, tablo INSERT/UPDATE/DELETE yazımı, maskeli konum, filtre kalıcılığı, harita, sonsuz kaydırma. F3 kodu **şablon**dur; bu spec deltaları ve reuse'u tanımlar.

**Kapsam kararı (kullanıcı: "otonom devam"; Rule 5 ölçek):** En büyük domain. **Çekirdek Adoptions** bu döngüde: browse/filtre/harita/create/edit/benim ilanlarım/detay/owner-actions + adoption'a özel alanlar + sales-ban banner. **Ertelenen (fail-loud):** başvurular (apply-to-adopt + owner-tanımlı sorular + owner inceleme + benim başvurularım), yorumlar, poster/share, push tercihleri, bookmarks, **video** (web core images-only), public shareable adoption detay sayfası.

**F0-F3'ten devralınan reuse:** `lib/maps/*` (google-maps.ts, maps-provider.tsx), `lib/storage/listing-images.ts` (images, ≤3), `components/lost-found/location-picker.tsx` (WKT pin-picker; genelleştirilecek ya da doğrudan kullanılacak), `components/user/user-avatar.tsx`, `lib/geo/turkey.ts`, F0 gate/AppShell/tema, F3 filtre/read/actions/card **desenleri**.

---

## 1. Kilitlenen kararlar

| Karar | Seçim |
|---|---|
| Kapsam | Çekirdek adoptions (LF-paralel); başvurular+yorumlar+video vs. ertelendi |
| Okumalar | Sadece RPC (`browse_adoptions`/`nearby_adoptions`/`adoptions_in_bounds`/`get_adoption_by_id`) — `.returns<Row[]>()`; `adoptions`'ta `.select('*')` YASAK (42501) |
| Yazımlar | Tablo INSERT/UPDATE/DELETE (Server Action), açık kolon listesi |
| Konum | **`location` NOT NULL** — create'te WKT nokta ZORUNLU (geolocation VEYA harita pin); şehir de zorunlu (dropdown). Harita key yoksa graceful degrade → geolocation-only; nokta hiç yoksa create bloke + net TR mesaj |
| Silme | **Hard DELETE** (soft `deleted_at` DEĞİL — vestigial) + best-effort görsel temizliği |
| Medya | **Sadece görsel** (video ertelendi); `assets` bucket, ≤3, `listing-images.ts` reuse; `videos: []` yazılır |
| Status | `open`/`closed`/`pasif` — closed=sahiplendirildi (manuel), pasif=45 gün cron arşivi; `adopted` bool ayrı |
| Detay | Authed `(app)/adoptions/[id]` (get_adoption_by_id anon-open ama core'da authed); public shareable sayfa ertelendi |
| Sales-ban banner | Client-only localStorage (30 gün cooldown), liste üstünde |

---

## 2. Kapsam sınırları

**IN:** domain tipleri (enum'lar+bool'lar+extra_info+filtreler); read layer (4 RPC + mapping); write actions (create/update/delete/markAdopted/bump/reactivate); browse liste + card + status badge + gender chip + sales-ban banner; filtre + kalıcılık (12 alan); benim ilanlarım; create form (konum ZORUNLU); edit form (keepExistingLocation, status-lock, domain-bool force-include); authed detay + domain info cards + owner actions; harita görünümü + pin-picker (F3 reuse); nav wiring.

**OUT (fail-loud):** başvurular (apply/sorular/inceleme/my-applications), yorumlar, poster/share, push prefs, bookmarks, **video**, public shareable adoption detay, `name` alanı (ölü — title kullan).

---

## 3. Rota ağacı
```
app/(app)/adoptions/
  page.tsx          # DEĞİŞ: placeholder → browse + filtre
  map/page.tsx      # YENİ: harita (adoptions_in_bounds; F3 maps reuse)
  mine/page.tsx     # YENİ: benim ilanlarım
  create/page.tsx   # YENİ: ilan oluştur (konum zorunlu)
  [id]/page.tsx     # YENİ: authed detay + owner actions
  [id]/edit/page.tsx# YENİ: düzenle
```
Statik segmentler (`map`/`mine`/`create`) `[id]`'den önce çözülür.

---

## 4. Veri katmanı (mevcut; migration YOK)

### 4.1 `adoptions` tablosu (yazımda açık kolon; okuma RPC)
`id, created_at, updated_at, deleted_at (vestigial), user_id, location (geography POINT, NOT NULL, SELECT revoke), public_location (~1km grid maskeli), title (NOT NULL), breed, description, source (adoption_source), type (pet_type NOT NULL), gender (pet_gender), size (pet_size), age (pet_age), status (pet_adoption_status default open), comment_enabled (default true), images (text[]), videos (text[]), adopted (bool default false), city, district, neutered/vaccinated/good_with_kids/good_with_pets (bool), extra_info (jsonb), lifecycle_last_activity_at, lifecycle_reminder_stage, application_questions (jsonb — ertelendi)`. **Fee/price YOK (sales ban).** `name` YOK (model alanı ölü).

### 4.2 Enum'lar
`pet_type{dog,cat,bird,rabbit,hamster,fish,turtle,reptile,other}` (LF ile paylaşımlı — `lib/lost-found/types.ts`'te zaten var, reuse et), `adoption_source{street,shelter,home,temporary_home,veterinary_clinic}`, `pet_gender{male,female}`, `pet_size{small,medium,large}`, `pet_age{baby,young,adult,senior}`, `pet_adoption_status{open,closed,pasif}`. Domain bool'lar: `neutered, vaccinated, good_with_kids, good_with_pets`. `extra_info` jsonb: `{healthNotes, personalityTags: string[] (kPersonalityTags=[sakin,oyuncu,enerjik,korkak,sevecen,bagimsiz,sosyal]), personalityDesc, adoptionRequirements, returnPolicy}`. Tüm `.name` değerleri DB label ile birebir; TR çeviri UI label map'lerinde.

### 4.3 Okuma RPC'leri (`.rpc(name, params).returns<Row[]>()`)
Hepsi SECURITY DEFINER, `deleted_at IS NULL`, `status<>'pasif' OR owner`, blok filtreli, maskeli koordinat (owner→raw). `browse_adoptions` `adopted=false` zorlar + `lat/long/dist=null`.
- **`browse_adoptions(limits int=10, offsets int=0, sources_filter_param adoption_source[], pet_types_filter_param pet_type[], pet_sizes_filter_param pet_size[], pet_ages_filter_param pet_age[], pet_genders_filter_param pet_gender[], owner_user_id_param uuid, city_param text, district_param text, search_param text, neutered_param bool, vaccinated_param bool, good_with_kids_param bool, good_with_pets_param bool)`** → `RETURNS TABLE(id, created_at, updated_at, user_id, "user" json{id,username,profile_photo,created_at}, title, breed, description, comment_enabled, source, gender, size, age, type, images, videos, adopted, city, district, lat(null), long(null), dist_meters(null), neutered, vaccinated, good_with_kids, good_with_pets, extra_info, status, lifecycle_last_activity_at, application_questions)`. Order created_at DESC. anon+authed. Sayfa=10, offsets=page*10.
- **`nearby_adoptions(lat_param float8, long_param float8, ...browse ile aynı..., max_distance_m_param int)`** → + maskeli coords + dist_meters dolu. KNN. radius clamp 1-50km.
- **`adoptions_in_bounds(min_lat, min_long, max_lat, max_long float8, sources_filter_param, pet_types_filter_param, pet_sizes_filter_param, pet_ages_filter_param, pet_genders_filter_param, owner_user_id_param uuid, limits int=500, neutered_param, vaccinated_param, good_with_kids_param, good_with_pets_param)`** → **city/district/search param YOK**. Bbox. dist null. (Mobil harita 4 bool'u geçmiyor; web'de de geçmeyebiliriz — not.)
- **`get_adoption_by_id(p_id uuid)`** → tek satır, **anon-open**, adopted=true dahil (paylaşılan link 404 olmasın), maskeli coords.

**Benim ilanlarım:** `browse_adoptions(owner_user_id_param=me, diğer filtreler null)`.

### 4.4 Yazma yolu (Server Action, session-authoritative)
- **create:** `INSERT INTO adoptions (açık kolon)` — `user_id=session`, `title, type` zorunlu; `location` WKT `'POINT(<lon> <lat>)'` **ZORUNLU** (nokta yoksa action reddeder); `city` zorunlu; opsiyonel breed/description/source/gender/size/age/4-bool/extra_info; `images` (≤3), `videos: []`. `.insert(row).select('id').single()`. **Rate-limit:** `adoption_create_rate_limit` (23514) → ayrı TR mesaj.
- **update:** PATCH `.eq('id',id).eq('user_id',me).select('id')` + zero-row bail (F3 Task-3 fix deseni). `keepExistingLocation`: pin dokunulmadıysa `location` payload'dan çıkarılır; açık temizleme yok (konum zorunlu, temizlenemez). 4 domain-bool + extra_info null olsa bile force-include (aksi halde stale kalır).
- **delete:** hard DELETE `.eq('id',id).eq('user_id',me)` + best-effort görsel temizliği.
- **markAdopted:** `UPDATE {adopted: bool} .eq('id',id).eq('user_id',me).select('id')` + zero-row bail.
- **lifecycle:** `bump_adoption_activity(p_listing_id)`, `reactivate_adoption(p_listing_id)` — owner-check server'da.

### 4.5 Görsel
`lib/storage/listing-images.ts` **reuse** (assets, ≤3, bare filename). Video yok.

---

## 5. Özellik spec'leri (özet — F3 paralelleri)

### 5.1 Domain (`lib/adoptions/types.ts`)
`AdoptionStatus`, `AdoptionSource`, `PetSize`, `PetAge` (+ label map'ler); `PetType`/`PetGender` `@/lib/lost-found/types`'tan reuse. `AdoptionExtraInfo`, `PERSONALITY_TAGS`. `AdoptionListing` (LF `LostFoundListing` benzeri + source/size/age/adopted/4-bool/extraInfo/commentEnabled). `AdoptionFilters` (12 alan). `AdoptionRow` (RPC snake_case).

### 5.2 Read (`lib/adoptions/read.ts`) — F3 `read.ts` aynası
`browseAdoptions(filters, page, ownerUserId?)`, `nearbyAdoptions(lat,long,filters,page)`, `adoptionsInBounds(bounds, filters)`, `getAdoptionById(id)` + `mapRowToAdoption`. RPC param adları §4.3'ten birebir. `PER_PAGE=10` server-safe modülde (F3 dersi).

### 5.3 Write (`lib/adoptions/actions.ts`, `'use server'`) — F3 `actions.ts` aynası
`createAdoptionAction`, `updateAdoptionAction`, `deleteAdoptionAction`, `markAdoptedAction`, `bumpAdoptionAction`, `reactivateAdoptionAction`, `loadBrowseAdoptionsAction`, `loadNearbyAdoptionsAction`, `adoptionsInBoundsAction`. create **konum zorunlu** doğrulaması. Dönüş `{ok, id?}|{error}`.

### 5.4 Browse `/adoptions` + card + badge + sales-ban
`AdoptionCard` (F3 `LfListingCard` benzeri): foto, status badge (open→hiçbir şey, closed→"Sahiplendirildi", pasif→"Pasif"), gender chip, title (`title` — name değil), tür/cins, stale (`lifecycle_last_activity_at` >30 gün — LF'nin createdAt'ından FARKLI). Mesafe yok (browse coords döndürmez). Sonsuz kaydırma. **SalesBanBanner** (client, localStorage `adoption_sales_ban_shown` 30 gün cooldown, liste üstünde, kapatılabilir, "Detaylar"→/tos veya about).

### 5.5 Filtre `/adoptions` (`lib/adoptions/filters.ts` + `adoption-filter-bar.tsx`) — F3 filtre aynası
Alanlar: sources[], types[], sizes[], ages[], genders[], city, district, radiusKm (radius↔city dışlama), search (300ms), neutered/vaccinated/good_with_kids/good_with_pets (bool? — sadece true veya null). localStorage `adoption_filter_snapshot_v1` owner-stamped, search hariç, total decoder. `pasif` UI'da yok.

### 5.6 Benim ilanlarım `/adoptions/mine`
`browseAdoptions(EMPTY, 0, me.id)` → card grid; boş "Henüz ilanın yok." + "İlan ver".

### 5.7 Create `/adoptions/create` (`components/adoptions/adoption-form.tsx`)
Zorunlu: foto(1-3), title, city, type, **konum noktası** (geolocation "konumumu bul" VEYA harita pin — key yoksa geolocation-only; nokta yoksa submit bloke + "İlanın konumunu belirlemelisin"). Opsiyonel: breed, description, source, gender, size, age, 4 domain-bool (yes/no toggle), extra_info (personality tags [PERSONALITY_TAGS chip], personalityDesc, healthNotes, adoptionRequirements, returnPolicy — free text). Submit → `createAdoptionAction` → `/adoptions/[id]`.

### 5.8 Edit `/adoptions/[id]/edit`
`getAdoptionById` + owner-değil redirect. Create alanları + farklar: status closed/pasif ise kilitli (F3 fieldset deseni); mevcut foto koru; `keepExistingLocation` (pin dokunulmazsa location gönderme); 4 bool + extra_info force-include.

### 5.9 Detay `/adoptions/[id]` + owner actions + domain info cards
`getAdoptionById(id)` null → notFound. Gösterir: foto galerisi, status+stale badge, tür/cins/yaş/boyut/cinsiyet/kaynak, konum "İl, İlçe", title, description, **AdoptionDomainInfoCards** (yalnızca `true` olan bool'lar + extra_info dolu alanlar; hiçbiri yoksa kart gizli), ilan sahibi (F2 `UserAvatar`→/profile/user/[id]). isOwner ise `<AdoptionOwnerActions>`: **Sahiplendirildi işaretle** (markAdopted, open&!adopted), **Bump** "Hâlâ sahiplendiriyorum" (open&!adopted), **Yeniden yayınla** (pasif), Düzenle, Sil. Share/Applications **yok** (deferred, gizli). Non-owner: başvuru CTA'sı **yok** (applications deferred) — sadece "Uygulamada başvur" ipucu veya hiçbir şey.

### 5.10 Harita `/adoptions/map` + pin-picker
F3 `lib/maps/*` reuse; `adoptionsInBounds` bbox + "Bu alanı ara" + marker (open=yeşil, adopted=gri ama RPC adopted döndürmez) → detay. Pin-picker: F3 `location-picker.tsx` reuse (genelleştir: `components/maps/location-picker.tsx`'e taşı ya da doğrudan import). Key yoksa graceful degrade.

---

## 6. Güvenlik & gizlilik (KVKK)
1. `adoptions`'ta `.select('*')` YASAK; okumalar RPC, yazımlar açık kolon.
2. Maskeli koordinat (RPC döndürdüğü lat/long); raw `location` asla okunmaz.
3. Yazım session-authoritative (`user_id`=getUser); update/delete/markAdopted ownership-scoped + `.select('id')` zero-row bail (F3 Critical fix deseni).
4. Metin sanitize (title/description/extra_info); XSS: JSX escape.
5. Rate-limit sentinel ayrı ele alınır. pasif owner-only, blok filtreli (RPC zorlar).

---

## 7. Başarı kriterleri
1. `/adoptions` gerçek browse: filtre (12 alan)/arama/sonsuz kaydırma; boş/hata TR.
2. Filtreler localStorage'da kalıcı (owner-stamped, arama hariç, radius↔city).
3. `/adoptions/create` zorunlu {foto,title,city,type,**konum noktası**} ile ilan oluşturur; konum yoksa bloke; DB satırı+görsel yazılır; rate-limit ayrı mesaj.
4. `/adoptions/[id]/edit` owner düzenler; closed/pasif'te kilitli; keepExistingLocation; 4 bool+extra_info force-include; owner değilse redirect.
5. `/adoptions/[id]` detay: alanlar + domain info cards (yalnızca pozitif) + owner kimliği; owner actions yalnızca owner'a; **PII sızıntısı yok** (maskeli konum).
6. `/adoptions/mine` yalnızca kullanıcının ilanları.
7. markAdopted → adopted=true; bump → lifecycle reset; reactivate → open; sil → hard delete + görsel temizliği.
8. `/adoptions/map` (key varsa) bbox marker'ları; key yoksa graceful degrade.
9. Sales-ban banner liste üstünde, 30 gün cooldown, kapatılabilir.
10. `npm run build` temiz; `adoptions`'ta `.select('*')` yok.
11. Ertelenenler (başvurular, yorumlar, video, poster, public detay) sessizce eksik değil — spec'te işaretli, UI'da başvuru CTA'sı gizli.

## 8. Global Constraints
- TR-only; TS strict (`noUncheckedIndexedAccess`/`noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns`).
- Migration YOK; okuma=RPC `.returns<Row[]>()`, yazım=açık kolon; `.select('*')` YASAK.
- Server→`await createClient()`, Client→`createClient()`.
- PII: maskeli koordinat; `get_adoption_by_id` anon-open (core'da authed sarmalanır).
- Görsel `<img>`+eslint-disable; assets bare filename; **video yok**.
- WKT `'POINT(lon lat)'` (lon önce). Konum **zorunlu** (create).
- Enum `.name` DB ile birebir; `PetType`/`PetGender` LF tiplerinden reuse (kopyalama).
- Harita: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` yoksa graceful degrade; F3 `lib/maps/*` reuse.
- Reuse: `lib/storage/listing-images.ts`, `lib/maps/*`, `location-picker`, `UserAvatar`, `lib/geo/turkey`. Yeni dependency YOK.
- Commit: explicit `git add <paths>` (asla -am/-A); `feat/web-adoptions` branch; main'e/push YOK.

## 9. Test/doğrulama
Runner yok. `npm run build` (otoritatif). Cihaz/smoke: logged-out `(app)/adoptions*` → 307/auth/login; authed (kimlik varsa) browse/create/detay/edit; harita yalnızca key varsa (yoksa graceful-degrade kartı; runtime doğrulanamaz — fail-loud). Canlı DB: create/edit/delete/markAdopted gerçek satır (mevcut tabloya normal yazım; migration değil).
