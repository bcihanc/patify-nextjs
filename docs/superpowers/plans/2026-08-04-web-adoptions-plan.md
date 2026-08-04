# Adoptions (Sahiplendirme) — Implementation Plan (Çekirdek)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Web'e çekirdek Adoptions — browse+filtre+harita, create/edit (konum zorunlu), benim ilanlarım, authed detay + owner actions (mark-adopted/bump/reactivate) — mevcut Supabase şemasına karşı (migration yok).

**Architecture:** **Lost & Found (F3) ile birebir paralel.** Her task ilgili F3 dosyasını ŞABLON alır, adoption deltalarını uygular. Okuma=RPC `.returns<Row[]>()`; yazım=Server Action + açık kolon (`adoptions`'ta `.select('*')` YASAK); harita=F3 `lib/maps/*` reuse; görsel=`lib/storage/listing-images.ts` reuse.

**Tech Stack:** Next.js 15, React 19, TS strict, Supabase `@supabase/ssr`, Tailwind+shadcn, `@vis.gl/react-google-maps` (mevcut).

## Global Constraints
- TR-only; TS strict (`noUncheckedIndexedAccess` → `rows[0]!`+disable; `noUnusedLocals/Parameters`, `noImplicitReturns`).
- Migration YOK. Okuma=RPC; yazım=açık kolon. `adoptions`'ta `.select('*')` YASAK (prod 42501). Yalnızca `.insert/update(...).select('id')` serbest.
- PII/KVKK: RPC'nin döndürdüğü maskeli `lat/long`; raw `location` asla okunmaz. Yazım session-authoritative (`user_id`=getUser); update/delete/markAdopted ownership-scoped + `.select('id')` zero-row bail.
- Supabase: Server→`await createClient()`; Client→`createClient()`.
- Görsel `<img>`+`// eslint-disable-next-line @next/next/no-img-element`; assets bare filename; **video YOK**.
- WKT `'POINT(<lon> <lat>)'` (lon önce). **Konum create'te ZORUNLU** (`adoptions.location` NOT NULL).
- Enum `.name` DB ile birebir; `PetType`/`PetGender` `@/lib/lost-found/types`'tan import (kopyalama).
- Harita: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` yoksa graceful degrade (F3 `lib/maps/google-maps.ts` `hasMapsKey()`).
- Reuse: `lib/storage/listing-images.ts`, `lib/maps/{google-maps.ts,maps-provider.tsx}`, `components/lost-found/location-picker.tsx` (jenerik: `{initial,onChange(wkt)}` — doğrudan import; adı tarihsel), `components/user/user-avatar.tsx`, `lib/geo/turkey.ts`. Yeni dependency YOK.
- Test runner yok → her task `npm run build` temiz (implementer GERÇEKTEN çalıştırır). Commit: explicit `git add <paths>` (asla `-am`/`add -A` — repo'da uncommitted `.gitignore` + untracked `deno.lock` var). Branch `feat/web-adoptions`; main'e/push YOK.
- **Bayat LSP uyarısı:** yeni dosyalarda "Cannot find module" (2307) veya `.returns` deprecation (6385) / 71007 onChange = editör-only false-positive; `npm run build`/`tsc --noEmit` otoritatif.

## Reuse Map (F3 → Adoptions)
| F3 dosyası (şablon) | Adoptions karşılığı |
|---|---|
| `lib/lost-found/types.ts` | `lib/adoptions/types.ts` |
| `lib/lost-found/read.ts` | `lib/adoptions/read.ts` |
| `lib/lost-found/actions.ts` | `lib/adoptions/actions.ts` |
| `lib/lost-found/filters.ts` | `lib/adoptions/filters.ts` |
| `components/lost-found/lf-status-badge.tsx` | `components/adoptions/adoption-status-badge.tsx` |
| `components/lost-found/lf-listing-card.tsx` | `components/adoptions/adoption-card.tsx` |
| `components/lost-found/lf-filter-bar.tsx` | `components/adoptions/adoption-filter-bar.tsx` |
| `components/lost-found/owner-actions.tsx` | `components/adoptions/adoption-owner-actions.tsx` |
| `components/lost-found/listing-form.tsx` | `components/adoptions/adoption-form.tsx` |
| `app/(app)/lost-found/{page,browse-list,mine/page,create/page,[id]/page,[id]/edit/page,map/page,map-view}.tsx` | `app/(app)/adoptions/...` |
| `lib/storage/listing-images.ts`, `lib/maps/*`, `components/lost-found/location-picker.tsx`, `components/user/user-avatar.tsx` | **reuse as-is** |

---

### Task 1: Domain tipleri
**Files:** Create `lib/adoptions/types.ts`.
**Şablon:** `lib/lost-found/types.ts`. **Produces:** `AdoptionStatus`('open'|'closed'|'pasif'), `AdoptionSource`('street'|'shelter'|'home'|'temporary_home'|'veterinary_clinic'), `PetSize`('small'|'medium'|'large'), `PetAge`('baby'|'young'|'adult'|'senior') + label map'ler; `PERSONALITY_TAGS=['sakin','oyuncu','enerjik','korkak','sevecen','bagimsiz','sosyal']` + label map; `AdoptionExtraInfo={healthNotes?,personalityTags:string[],personalityDesc?,adoptionRequirements?,returnPolicy?}`; `AdoptionListing` (id, createdAt, userId, user:LfUserSummary|null [reuse from `@/lib/lost-found/types`], title, breed, description, source, type:PetType [reuse], gender:PetGender|null [reuse], size, age, status, city, district, images[], adopted, commentEnabled, neutered/vaccinated/goodWithKids/goodWithPets:boolean|null, extraInfo:AdoptionExtraInfo|null, lat, long, distMeters, lifecycleLastActivityAt); `AdoptionFilters` (sources[], types[], sizes[], ages[], genders[], city, district, radiusKm, search, neutered?, vaccinated?, goodWithKids?, goodWithPets? — bool|null) + `EMPTY_ADOPTION_FILTERS`; `AdoptionRow` (RPC snake_case per spec §4.3 RETURNS); `PET_TYPE_LABELS`/`petTypeLabel` reuse from lost-found (re-export or import). `PER_PAGE=10`.
- Import `PetType`, `PetGender`, `LfUserSummary`, `PET_TYPE_LABELS`, `petTypeLabel` from `@/lib/lost-found/types` (do NOT redefine).
- [ ] Build clean. Commit `feat(adoptions): domain types (enums, extra_info, filters, list row)` (`git add lib/adoptions/types.ts`).

### Task 2: Read layer
**Files:** Create `lib/adoptions/read.ts`. **Şablon:** `lib/lost-found/read.ts`.
- `browseAdoptions(filters, page, ownerUserId?)`, `nearbyAdoptions(lat,long,filters,page)`, `adoptionsInBounds(bounds,filters)`, `getAdoptionById(id)` + `mapRowToAdoption(row)` + `MapBounds` (reuse F3 `MapBounds` or redeclare). RPC names/params **exactly** per spec §4.3 (`browse_adoptions`/`nearby_adoptions`/`adoptions_in_bounds`/`get_adoption_by_id`; array params `sources_filter_param`/`pet_types_filter_param`/`pet_sizes_filter_param`/`pet_ages_filter_param`/`pet_genders_filter_param`; bool params `neutered_param` etc.; `owner_user_id_param`; `city_param`/`district_param`/`search_param` on browse+nearby only; **in_bounds has NO city/district/search**; `limits`/`offsets`; nearby `lat_param`/`long_param`/`max_distance_m_param`). `.rpc(name, params).returns<AdoptionRow[]>()`. `mapRowToAdoption`: snake→camel incl. extra_info (jsonb→AdoptionExtraInfo), 4 bools, images→URL (assets base), user summary. Error→[]/null + console.error.
- Import types from `@/lib/adoptions/types`.
- [ ] Build clean. Commit `feat(adoptions): read layer (browse/nearby/in-bounds/detail RPC wrappers)` (`git add lib/adoptions/read.ts`).

### Task 3: Write actions
**Files:** Create `lib/adoptions/actions.ts` (`'use server'`). **Şablon:** `lib/lost-found/actions.ts` (incl. its Task-3 cip-gate/`.select('id')` zero-row bail pattern).
- `AdoptionInput` type (title, type, city, district?, breed?, description?, source?, gender?, size?, age?, images[], neutered?/vaccinated?/goodWithKids?/goodWithPets?, extraInfo?, locationWkt) — module-local `Result`/sentinel non-exported.
- `createAdoptionAction(input)`: getUser gate; validate title+type+city present AND **`input.locationWkt` present** (else `{error:'İlanın konumunu belirlemelisin.'}` — location is NOT NULL); INSERT explicit columns (`user_id, title, type, location: locationWkt, city, district, breed, description, source, gender, size, age, images, videos: [], neutered, vaccinated, good_with_kids, good_with_pets, extra_info`); `.select('id').single()`; rate-limit `adoption_create_rate_limit` (message.includes → TR "Saatte en fazla 10 ilan…"); return `{ok,id}`.
- `updateAdoptionAction(id, input & {keepExistingLocation?})`: `.update(row).eq('id',id).eq('user_id',user.id).select('id')` + zero-row bail (`'Bu ilanı düzenleme yetkin yok.'`); if `keepExistingLocation` OR no locationWkt → omit `location` from row (location is NOT NULL, never null it); **force-include** the 4 bools + `extra_info` even when null.
- `deleteAdoptionAction(id, images?)`: hard delete `.eq('id',id).eq('user_id',user.id)` + best-effort assets cleanup.
- `markAdoptedAction(id, adopted)`: `.update({adopted}).eq('id',id).eq('user_id',user.id).select('id')` + zero-row bail.
- `bumpAdoptionAction(id)` → `.rpc('bump_adoption_activity',{p_listing_id:id})`; `reactivateAdoptionAction(id)` → `.rpc('reactivate_adoption',{p_listing_id:id})`.
- `loadBrowseAdoptionsAction(filters,page)`, `loadNearbyAdoptionsAction(lat,long,filters,page)`, `adoptionsInBoundsAction(bounds,filters)` (call read layer; for filter-driven client fetch).
- Import read fns + types.
- [ ] Build clean. Commit `feat(adoptions): write actions (create/update/delete/markAdopted + lifecycle, location required)` (`git add lib/adoptions/actions.ts`).

### Task 4: Browse list + card + status badge
**Files:** Create `components/adoptions/adoption-status-badge.tsx`, `components/adoptions/adoption-card.tsx`, `app/(app)/adoptions/browse-list.tsx`; Modify `app/(app)/adoptions/page.tsx`. **Şablon:** F3 Task 5 files.
- `AdoptionStatusBadge`: **open → render null** (active is unmarked); closed→"Sahiplendirildi" (grey), pasif→"Pasif" (grey). (F3 badge but open=null.)
- `AdoptionCard`: mirror `LfListingCard` — foto (images[0] or pet-icon fallback), status badge (only non-open), gender chip (optional), title (`listing.title`), type/breed, stale suffix via `lifecycleLastActivityAt` >30d (NOT createdAt). **No distance** (browse returns no coords). Link `/adoptions/[id]`.
- `browse-list.tsx` (`'use client'`): mirror F3 browse-list — items+page state, `loadBrowseAdoptionsAction` load-more, empty state ("Sonuç yok" + "İlan ver" → /adoptions/create). (Filter wiring in Task 5.)
- `page.tsx`: server, `browseAdoptions(EMPTY_ADOPTION_FILTERS,0)`, header "Sahiplendirme" + "Harita"(/adoptions/map) + "İlan ver"(/adoptions/create) + `<BrowseList initial ownerId>` (pass current user id for Task 5 filter owner-stamp).
- [ ] Build clean. Commit `feat(adoptions): browse list + card + status badge` (explicit paths incl. actions.ts if load-more added there).

### Task 5: Filters + persistence + filter bar
**Files:** Create `lib/adoptions/filters.ts`, `components/adoptions/adoption-filter-bar.tsx`; wire into browse-list/page. **Şablon:** F3 `lib/lost-found/filters.ts` + `lf-filter-bar.tsx`.
- filters.ts: encode/decode (total decoder, search excluded, enum `.name`), `saveFilterSnapshot`/`loadFilterSnapshot(ownerId)` key `adoption_filter_snapshot_v1` owner-stamped, `window` guards, mutual-exclusion `withCity`/`withDistrict`/`withRadius` (city↔radius). Fields: sources[], types[], sizes[], ages[], genders[], city, district, radiusKm, neutered/vaccinated/goodWithKids/goodWithPets (bool|null).
- filter-bar (`'use client'`): city/district (turkey geo), radius presets [1,5,10,25,50], multi-select chips for sources(`ADOPTION_SOURCE_LABELS`)/types(`PET_TYPE_LABELS`)/sizes/ages/genders, 4 bool toggles (set true or clear to null), search (300ms debounce), "Filtreleri temizle". Props `{filters,onChange}`. **`pasif` status offered? NO — adoptions have no status filter chips in scope (status not a filter field; browse hides pasif server-side).**
- browse-list: hold filters+items, hydrate from `loadFilterSnapshot(ownerId)` on mount, refetch page 0 on change (nearby if radius+geolocation, else browse), geolocation-denied → clear radius + notice + fallback.
- [ ] Build clean. Commit `feat(adoptions): filters + persistence + filter bar`.

### Task 6: Sales-ban banner
**Files:** Create `components/adoptions/sales-ban-banner.tsx` (`'use client'`); render atop `/adoptions` list (in browse-list or page).
- Client-only: localStorage key `adoption_sales_ban_shown` (ISO timestamp), 30-day cooldown; show a dismissible TR info card ("Patify'da ücretli hayvan satışı/takası yasaktır…") + a "Detaylar" link (→ `/tos`); dismiss for session; `window` guard; renders null if within cooldown or dismissed. Only when the list has ≥1 item (pass a prop or render in the has-items branch).
- [ ] Build clean. Commit `feat(adoptions): sales-ban info banner (client, 30-day cooldown)`.

### Task 7: My adoptions
**Files:** Create `app/(app)/adoptions/mine/page.tsx`. **Şablon:** F3 `lost-found/mine/page.tsx`.
- Auth gate; `browseAdoptions(EMPTY_ADOPTION_FILTERS, 0, me.id)`; `AdoptionCard` grid; empty "Henüz ilanın yok." + "İlan ver".
- [ ] Build clean. Commit `feat(adoptions): my listings page (/adoptions/mine)`.

### Task 8: Create form + create page (+ location required)
**Files:** Create `components/adoptions/adoption-form.tsx` (`'use client'`), `app/(app)/adoptions/create/page.tsx`. **Şablon:** F3 `listing-form.tsx` + `create/page.tsx`.
- Form (`mode:'create'|'edit'`, `initial?`, `onSubmit`): photos (1-3, `uploadListingImages` reuse, previews); title (required Input); city/district selects (turkey geo) + "Konumumu bul" geolocation → WKT; **`<LocationPicker>` reuse (`@/components/lost-found/location-picker`) → sets `locationWkt`**; type select; "Detaylar" section: source/gender/size/age selects, breed Input, 4 domain-bool toggles, extra_info (personality tag chips `PERSONALITY_TAGS`, personalityDesc/healthNotes/adoptionRequirements/returnPolicy textareas), description textarea.
- **Location REQUIRED:** submit blocked unless `locationWkt` present (TR "İlanın konumunu haritadan veya 'Konumumu bul' ile belirle."). Without a maps key the picker renders null → geolocation is the only path; if geolocation also unavailable, the user cannot create (surface the message).
- create page: server auth gate → `<AdoptionForm mode="create" onSubmit={createAdoptionAction}/>`; on `{ok,id}` `router.push('/adoptions/'+id)`; rate-limit/error TR.
- [ ] Build clean. Commit `feat(adoptions): shared adoption form + create page (location required)`.

### Task 9: Edit page
**Files:** Create `app/(app)/adoptions/[id]/edit/page.tsx`. **Şablon:** F3 `lost-found/[id]/edit/page.tsx`.
- Auth gate; `getAdoptionById(id)`; owner-değil → redirect `/adoptions/[id]`; `<AdoptionForm mode="edit" initial={{listing}} onSubmit={(input)=>updateAdoptionAction(id,input)}/>`.
- Farklar: status `closed`/`pasif` → form kilitli (F3 `<fieldset disabled>` deseni; `statusLocked?actualStatus:status`); mevcut foto koru (0 yeni OK); `keepExistingLocation` (pin dokunulmazsa location gönderme — location NOT NULL, asla null'lama); 4 bool + extra_info force-include.
- [ ] Build clean. Commit `feat(adoptions): edit page (status-lock, keep-existing-location/photos)`.

### Task 10: Detail + owner actions + domain info cards
**Files:** Create `app/(app)/adoptions/[id]/page.tsx`, `components/adoptions/adoption-owner-actions.tsx` (`'use client'`), `components/adoptions/adoption-domain-info-cards.tsx`. **Şablon:** F3 `lost-found/[id]/page.tsx` + `owner-actions.tsx`.
- Detail: auth gate; `getAdoptionById(id)` null → notFound; foto galerisi, status+stale badge, tür/cins/yaş/boyut/cinsiyet/kaynak (label maps), konum "İl, İlçe" (maskeli), title, description, `<AdoptionDomainInfoCards listing>` (only `=== true` bools + non-empty extra_info fields; whole card hidden if none), owner (`UserAvatar`+username → `/profile/user/[userId]`). isOwner → `<AdoptionOwnerActions>`.
- `AdoptionDomainInfoCards`: render "Aşılı"/"Kısırlaştırılmış"/"Çocuklarla iyi"/"Diğer hayvanlarla iyi" only when true; personality tags (labels), personalityDesc/healthNotes/adoptionRequirements/returnPolicy sections when present.
- `AdoptionOwnerActions` (`'use client'`): Düzenle (link `/adoptions/[id]/edit`); Sil (inline confirm → `deleteAdoptionAction(id, listing.images)` → `/adoptions/mine`); if `status==='open' && !adopted`: "Sahiplendirildi olarak işaretle" (`markAdoptedAction(id,true)` → refresh) + "Hâlâ sahiplendiriyorum" (`bumpAdoptionAction(id)` → refresh); if `status==='pasif'`: "Yeniden yayınla" (`reactivateAdoptionAction(id)` → refresh). Share/Applications YOK (deferred). Optimistic/useTransition + TR errors.
- Non-owner: NO application CTA (deferred) — omit (no "yakında" placeholder).
- [ ] Build clean. Commit `feat(adoptions): authed detail + owner actions + domain info cards`.

### Task 11: Map view + nav wiring + phase-end
**Files:** Create `app/(app)/adoptions/map/page.tsx`, `app/(app)/adoptions/map-view.tsx`. **Şablon:** F3 `lost-found/map/page.tsx` + `map-view.tsx` (reuse `lib/maps/*`).
- map/page: auth gate; `hasMapsKey()` false → graceful-degrade card ("Harita için yapılandırma gerekli…" + link /adoptions); true → `<AdoptionMapView>`.
- map-view (`'use client'`): reuse F3 maps provider/GoogleMap; initial bbox → `adoptionsInBoundsAction`; "Bu alanı ara" (no continuous re-query); markers (open colour) → `/adoptions/[id]`; "Konumumu bul" recenter. (in_bounds ignores the 4 bool filters — matching mobile; note.)
- Nav: `components/app-shell/nav-items.ts` already has "Sahiplen" → `/adoptions` (verify; no change expected). Ensure `/adoptions` page links to map/mine/create.
- [ ] Build clean. Commit `feat(adoptions): map view (graceful degrade) + nav wiring`.
- [ ] **Faz sonu smoke (controller):** logged-out `(app)/adoptions*` → 307; harita key yoksa graceful-degrade; authed runtime + map runtime **key/creds gerektirir (fail-loud)**.

---

## Self-Review
**Spec coverage:** §7 kriter→task: 1(browse)→T4/T5; 2(filtre kalıcı)→T5; 3(create+konum zorunlu)→T3/T8; 4(edit)→T9; 5(detay+domain cards+PII)→T2/T10; 6(mine)→T7; 7(markAdopted/bump/reactivate/delete)→T3/T10; 8(harita+degrade)→T11; 9(sales-ban)→T6; 10(build+no select*)→her task; 11(deferral fail-loud)→T10(applications gizli)+spec §2. Kapsandı.
**Type consistency:** `AdoptionListing`/`AdoptionFilters`/`AdoptionRow`/`AdoptionInput` T1/T3'te; `PetType`/`PetGender` LF'ten reuse; `.returns<AdoptionRow[]>()` tüm okumada; `locationWkt` `'POINT(lon lat)'` her yazımda; location NOT NULL → create zorunlu, update keepExistingLocation.
**Reuse:** listing-images/maps/location-picker/user-avatar/geo doğrudan import; F3 dosyaları şablon.
