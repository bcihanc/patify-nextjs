# Web Emergency (Acil) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mobil Emergency (Acil) özelliğini web'e taşı — browse/filtre/harita/detay/create + claim/resolve. L&F/Adoptions'ın klonu + Emergency delta'ları.

**Architecture:** Reads = SECURITY DEFINER RPC (`.returns<EmergencyRow[]>()`), writes = Server Action (açık kolon). UI `app/(app)/emergency/*` + `components/emergency/*`. Spec: `docs/superpowers/specs/2026-08-05-web-emergency-design.md`.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`, `@vis.gl/react-google-maps`, lucide-react.

## Global Constraints

- main'e ASLA commit; push/deploy ASLA; **migration YOK** (emergency_cases + RPC'ler canlı DB'de var).
- Reads = RPC `.returns<EmergencyRow[]>()`. `database.types.ts` bilinçli bayat — DEĞİŞTİRME. Bayat LSP 2307/2724 = build/tsc otoritatif.
- Writes = açık kolon listesi; **`.select('*')` YASAK** (location SELECT revoke → 42501); create `.select('id')`, location asla projeksiyona konmaz; `reporter_user_id` session-authoritative (getUser).
- WKT **lon-first** `POINT(long lat)`.
- **Konum MASKESİZ** (L&F/Adoptions'ın aksine — sokak hayvanı). Maskeleme kodu EKLEME.
- Enum'lar DB ile byte-exact (`yarali|tehlikede|istismar|olu`, `acik|ustlenildi|cozuldu|pasif`). `PetType`/`LfUserSummary`/`PET_TYPE_LABELS`/`petTypeLabel` `@/lib/lost-found/types`'tan reuse (redefine YOK).
- **DM ve Report CTA'ları ERTELENDİ** — render etme, kod yorumu + `// DEFERRED: <faz>` bırak. **edit/delete/mine YOK** (mobilde de yok) — ekleme.
- Maps key = kullanıcı sağlar; key yoksa graceful-degrade (mevcut `lib/maps/*` kalıbı).
- Test runner yok → her task sonu `npm run build` temiz olmalı. Commit: açık `git add <paths>` (asla `-am`/`-A`).
- Rota grubu `(app)` (login-gated); mobil guest-browse ayrımı bu fazda değiştirilmez.

**Şablon dosyalar (her task bunları AYNALAR):**
- Types: `lib/adoptions/types.ts` · Read: `lib/adoptions/read.ts` · Actions: `lib/adoptions/actions.ts`
- Card/badge: `components/adoptions/adoption-card.tsx`, `adoption-status-badge.tsx`, `components/lost-found/lf-status-badge.tsx`
- Filter bar: `components/adoptions/adoption-filter-bar.tsx` · Form: `components/adoptions/adoption-form.tsx`
- Pages: `app/(app)/adoptions/{page,browse-list,map/page,map-view,create/page,[id]/page}.tsx`
- Maps: `lib/maps/google-maps.ts`, `lib/maps/maps-provider.tsx` · Location picker: `components/lost-found/location-picker.tsx`

**Mobil kaynak (referans doğruluğu):** `IdeaProjects/patify/lib/features/emergency/{models/emergency_models.dart, data/emergency_repo.dart, views/emergency_detail_page.dart, views/create_emergency_page.dart, views/emergency_list_page.dart, views/emergency_filter_widget.dart}`.

---

### Task 1: Domain types

**Files:**
- Create: `lib/emergency/types.ts`

**Interfaces (Produces):** `EmergencyKind`, `EmergencyStatus`, `EMERGENCY_KIND_LABELS`, `EMERGENCY_STATUS_LABELS`, `EmergencyListing`, `EmergencyRow`, `EmergencyFilters`, `EMPTY_EMERGENCY_FILTERS`, `PER_PAGE`. Re-export `PetType`, `LfUserSummary`, `PET_TYPE_LABELS`, `petTypeLabel` from `@/lib/lost-found/types`.

- [ ] **Step 1:** `lib/emergency/types.ts` yaz — spec §3'teki tüm tipler. Enum union'lar + label Record'ları (byte-exact TR: Yaralı/Tehlikede/İstismar/Ölü, Açık/Üstlenildi/Çözüldü/Pasif). `EmergencyListing` (camelCase, `photoUrl` full URL, `reporter: LfUserSummary | null`, `lat/long` maskesiz). `EmergencyRow` (snake_case: `reporter_user_id`, `reporter: {id, username, profile_photo, created_at} | null`, `pet_type`, `photo_url`, `claimed_by`, `claimed_at`, `resolved_at`, `dist_meters`, `lat`, `long`). `EmergencyFilters` = {kinds, statuses, city, district, radiusKm, search}. `EMPTY_EMERGENCY_FILTERS`. `PER_PAGE = 10`. Reuse'ları `@/lib/lost-found/types`'tan import + re-export.
- [ ] **Step 2:** `npm run build` → temiz (tsc unused-import fail eder, kullanılmayan import bırakma).
- [ ] **Step 3:** Commit: `git add lib/emergency/types.ts && git commit -m "feat(emergency): domain types + enums"`

---

### Task 2: Read layer

**Files:**
- Create: `lib/emergency/read.ts`

**Interfaces (Consumes):** Task 1 tipleri. **(Produces):** `browseEmergency(filters,page,reporterUserId?)`, `nearbyEmergency(lat,long,filters,page)`, `emergencyInBounds(bounds,filters)`, `getEmergencyById(id)`, `mapRowToEmergency(r)`, `MapBounds`, re-export `PER_PAGE`.

- [ ] **Step 1:** `lib/emergency/read.ts` yaz (`lib/adoptions/read.ts` aynalı). RPC adları/param'ları spec §4 ile byte-exact (`browse_emergency_cases`, `nearby_emergency_cases`, `emergency_cases_in_bounds`, `get_emergency_case_by_id`). `kind_param`/`status_param` boş dizi→null (`arrParam`). in_bounds city/district/search KABUL ETMEZ, limits 500. `mapRowToEmergency`: `photo_url`→assets public URL (`STORAGE_PUBLIC_BASE` kalıbı), `reporter`→`{id,username,profilePhoto}`|null, lat/long maskesiz. `getEmergencyById` 0 satır→null. Tüm çağrılar `.returns<EmergencyRow[]>()`.
- [ ] **Step 2:** `npm run build` → temiz (RPC adları types'ta yok → 2307/2724 çıkarsa tsc/build ile teyit et; bunlar bayat LSP, gerçek hata değil — Global Constraints).
- [ ] **Step 3:** Commit: `git add lib/emergency/read.ts && git commit -m "feat(emergency): read layer (browse/nearby/in-bounds/detail RPC)"`

---

### Task 3: Write actions

**Files:**
- Create: `lib/emergency/actions.ts`

**Interfaces (Consumes):** Task 1 tipleri, Task 2 read fn'leri. **(Produces):** `EmergencyInput`, `createEmergencyAction`, `claimEmergencyAction`, `resolveEmergencyAction`, `loadBrowseEmergencyAction`, `loadNearbyEmergencyAction`, `emergencyInBoundsAction`.

- [ ] **Step 1:** `lib/emergency/actions.ts` (`'use server'`) yaz (`lib/adoptions/actions.ts` aynalı):
  - `EmergencyInput = {kind, petType, description?, photoUrl, locationWkt?, city, district?}`.
  - `createEmergencyAction`: getUser gate → `{error:'Oturum bulunamadı.'}`; kind/petType/city zorunlu → `{error:'Zorunlu alanlar eksik.'}`; **locationWkt zorunlu** → `{error:'Vakanın konumunu belirlemelisin.'}`. INSERT `emergency_cases` açık kolon: `reporter_user_id: user.id` (session-auth), `kind, pet_type, description(clean), photo_url, location: locationWkt, city(clean), district(clean)`. `.select('id').single()` — **location projeksiyona KONMAZ**. Rate-limit sentinel `emergency_create_rate_limit` (mesaj-only match) → `{error:'Kısa sürede çok fazla vaka bildirdin, biraz sonra tekrar dene.'}`. Dönüş `{ok:true, id}`.
  - `claimEmergencyAction(id)`: getUser gate; `.rpc('claim_emergency_case',{case_id:id})` → `{ok:true, claimed: res===true}`.
  - `resolveEmergencyAction(id)`: getUser gate; `.rpc('resolve_emergency_case',{case_id:id})` → `{ok:true, resolved: res===true}`.
  - `loadBrowseEmergencyAction`, `loadNearbyEmergencyAction`, `emergencyInBoundsAction` → read fn'lerini çağırır.
  - `clean()` helper (trim + boş→null).
- [ ] **Step 2:** `npm run build` → temiz.
- [ ] **Step 3:** Commit: `git add lib/emergency/actions.ts && git commit -m "feat(emergency): write actions (create/claim/resolve, location required)"`

---

### Task 4: Badges + card

**Files:**
- Create: `components/emergency/emergency-kind-badge.tsx`, `components/emergency/emergency-status-badge.tsx`, `components/emergency/emergency-card.tsx`

**Interfaces (Consumes):** Task 1 tipleri. **(Produces):** `EmergencyKindBadge({kind})`, `EmergencyStatusBadge({status})`, `EmergencyCard({item})`.

- [ ] **Step 1:** İki badge (`components/lost-found/lf-status-badge.tsx` + `components/adoptions/adoption-status-badge.tsx` kalıbı): kind renkleri — yarali/tehlikede/istismar uyarı tonları, olu nötr; status — acik vurgulu, ustlenildi info, cozuldu başarı, pasif nötr. Label'lar Task 1 Record'larından. `EmergencyCard` (`adoption-card.tsx` kalıbı): tek `photoUrl` görsel (adoptions'ın `images[0]`'ı yerine), kind+status rozet, pet type + konum (city · district), `<img>` (next/image değil — proje kalıbı), `/emergency/{id}`'e link. Mesafe gösterme (nearby distMeters varsa opsiyonel, adoptions gibi göstermiyorsa gösterme).
- [ ] **Step 2:** `npm run build` → temiz.
- [ ] **Step 3:** Commit: `git add components/emergency/emergency-kind-badge.tsx components/emergency/emergency-status-badge.tsx components/emergency/emergency-card.tsx && git commit -m "feat(emergency): kind/status badges + card"`

---

### Task 5: Filter bar + browse

**Files:**
- Create: `components/emergency/emergency-filter-bar.tsx`, `app/(app)/emergency/browse-list.tsx`, `app/(app)/emergency/page.tsx`

**Interfaces (Consumes):** Task 1 tipleri, Task 3 `loadBrowseEmergencyAction`/`loadNearbyEmergencyAction`, Task 4 `EmergencyCard`.

- [ ] **Step 1:** `emergency-filter-bar.tsx` (`components/adoptions/adoption-filter-bar.tsx` kalıbı) — **daha dar filtre seti**: kind[] (çoklu toggle), status[] (çoklu toggle), city, district, search, radiusKm. localStorage persist (Adoptions key kalıbı, kendi anahtarı `emergency_filters`). radius↔city mutual-exclusion Adoptions'taki gibi. **pet size/gender/age/source/health-bool YOK.**
- [ ] **Step 2:** `browse-list.tsx` (client, `adoptions/browse-list.tsx` kalıbı): sonsuz kaydırma (PER_PAGE), filtre değişince ilk sayfa, radius aktif + geolocation → `loadNearbyEmergencyAction`, aksi → `loadBrowseEmergencyAction`, geolocation reddi fallback. `page.tsx` (server): başlık + `<EmergencyBrowseList>`.
- [ ] **Step 3:** `npm run build` → temiz.
- [ ] **Step 4:** Commit: `git add components/emergency/emergency-filter-bar.tsx "app/(app)/emergency/browse-list.tsx" "app/(app)/emergency/page.tsx" && git commit -m "feat(emergency): browse list + filter bar"`

---

### Task 6: Create form + page

**Files:**
- Create: `components/emergency/emergency-form.tsx`, `app/(app)/emergency/create/page.tsx`

**Interfaces (Consumes):** Task 1 tipleri, Task 3 `createEmergencyAction`, `lib/storage/listing-images.ts` (görsel yükleme), `components/lost-found/location-picker.tsx`.

- [ ] **Step 1:** `emergency-form.tsx` (client, `components/adoptions/adoption-form.tsx` + `create_emergency_page.dart` aynalı): alanlar — fotoğraf **tam 1 zorunlu** (video yok), kind (zorunlu, 4 seçenek segmented/toggle), konum (city zorunlu + district + **harita pini zorunlu**, `location-picker` reuse), pet type (zorunlu), açıklama (opsiyonel, maxLength 2000). Client validation: eksik alan → inline hata. **Pin yoksa submit BLOKLANIR** (`{error}` toast) — sessiz canlı-GPS'e ASLA düşme (spec §6). Görsel yükle (assets bucket, çıplak ad) → `createEmergencyAction`. Başarıda `/emergency/{id}`'e `router.replace`.
- [ ] **Step 2:** `create/page.tsx` (server, login-gated — `(app)` altında zaten): `<EmergencyForm>` render.
- [ ] **Step 3:** `npm run build` → temiz.
- [ ] **Step 4:** Commit: `git add components/emergency/emergency-form.tsx "app/(app)/emergency/create/page.tsx" && git commit -m "feat(emergency): create form + page (location required)"`

---

### Task 7: Detail + actions

**Files:**
- Create: `components/emergency/emergency-actions.tsx`, `app/(app)/emergency/[id]/page.tsx`

**Interfaces (Consumes):** Task 2 `getEmergencyById`, Task 3 `claimEmergencyAction`/`resolveEmergencyAction`, Task 4 badges.

- [ ] **Step 1:** `[id]/page.tsx` (server): `getEmergencyById(id)`, yoksa `notFound()`. `getUser()` → `currentUserId`. Render: fotoğraf, kind+status rozet, pet type başlık, konum metni (city · district), açıklama, **"Haritada gör"** butonu (lat/long varsa — maskesiz, "yaklaşık" notu YOK, konumu bir harita rotasına/linke taşır veya inline mini-harita; adoptions detay kalıbı). Aksiyon bar → `<EmergencyActions>` (client) prop'ları: `caseId, status, reporterUserId, claimedBy, currentUserId`.
- [ ] **Step 2:** `emergency-actions.tsx` (client): gating spec §7 birebir — `canClaim`, `canResolve`. Buton tıklama → action çağır → `router.refresh()`; toast (başarı/conflict). **DM ve Report CTA render ETME** — dosyaya `// DEFERRED: DM CTA → Chats fazı`, `// DEFERRED: Report menüsü → Moderasyon fazı` yorumları koy. Hiçbir aksiyon geçerli değilse `null` döndür.
- [ ] **Step 3:** `npm run build` → temiz.
- [ ] **Step 4:** Commit: `git add components/emergency/emergency-actions.tsx "app/(app)/emergency/[id]/page.tsx" && git commit -m "feat(emergency): detail page + claim/resolve actions"`

---

### Task 8: Map + nav wiring

**Files:**
- Create: `app/(app)/emergency/map/page.tsx`, `app/(app)/emergency/map-view.tsx`
- Modify: `components/app-shell/nav-items.ts`

**Interfaces (Consumes):** Task 3 `emergencyInBoundsAction`, Task 1 tipleri, `lib/maps/*`.

- [ ] **Step 1:** `map-view.tsx` (client, `adoptions/map-view.tsx` aynalı): Google Maps, key yoksa graceful-degrade kartı, `emergencyInBoundsAction` ile viewport + "Bu alanı ara" (loadedOnceRef kalıbı), marker tap → `/emergency/{id}`. `map/page.tsx` (server): `<EmergencyMapView>`.
- [ ] **Step 2:** `nav-items.ts` — `{ href:'/emergency', label:'Acil', icon: Siren }` ekle, **Sahiplen (`/adoptions`) ile Sohbet (`/chats`) arasına**. `Siren` import'unu `lucide-react`'ten ekle.
- [ ] **Step 3:** `npm run build` → temiz (39→40 route beklenir).
- [ ] **Step 4:** Commit: `git add "app/(app)/emergency/map/page.tsx" "app/(app)/emergency/map-view.tsx" components/app-shell/nav-items.ts && git commit -m "feat(emergency): map view (graceful degrade) + nav wiring"`

---

## Self-Review

- **Spec coverage:** §3→T1, §4→T2, §5→T3, §6 browse→T5/create→T6/detail→T7/map+nav→T8, badges→T4, §7 gating→T7, §8 KVKK→T2/T3, §10 kriterleri T1-T8'e dağıldı. ✅
- **Placeholder yok:** her step somut. ✅
- **Tip tutarlılığı:** `EmergencyRow`/`EmergencyListing`/`EmergencyFilters` T1'de tanımlı, T2-T8 aynı adları kullanıyor; `reporter` nested shape T1↔T2 tutarlı; RPC param adları spec §4 = mobil repo. ✅
- **Deferrals:** DM/Report T7'de fail-loud yorum; edit/delete/mine hiçbir task'ta yok. ✅
