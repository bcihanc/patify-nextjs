# F0 — Kimlikli App Shell + Auth/Onboarding Parity (Tasarım)

- **Tarih:** 2026-08-03
- **Durum:** Onaylandı (brainstorming) → plan yazımına hazır
- **Repo:** `patify-nextjs` (Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`)
- **Kardeş kaynak:** `/Users/cihan/IdeaProjects/patify` (Flutter mobil — özellik referansı)

---

## 0. Program bağlamı (bu spec'in yeri)

Hedef: **mobildeki tüm özellikleri web'e eksiksiz taşımak.** Bu tek bir spec değil, bir programdır. Mobil ile web **aynı Supabase projesini paylaşır** (`uynwrqccvfcwunrzoxva`) — DB, RPC, auth, storage, edge functions ortak. Dolayısıyla iş, çoğunlukla mevcut backend'e karşı **web UI + istemci mantığı** yazmaktır; backend baştan kurulmaz.

Her alan kendi brainstorm → spec → plan → uygulama döngüsünü alır. Önerilen sıra (ilerledikçe ayarlanabilir):

1. **F0 — Kimlikli app shell + auth/onboarding parity** ← *bu doküman*
2. Kullanıcı & Profil (takip/takipçi, `user/:id`, bookmarks)
3. Lost & Found (tam: browse, map, create, edit, "benim ilanlarım")
4. Posts → 5. Discussions → 6. Adoptions
7. Chats (realtime) → 8. Notifications (Web Push) → 9. Moderasyon/feedback/trust/about

> **Backend tipleri bayat uyarısı:** Web'in `database.types.ts`'i `user_private` tablosunu içermiyor, `user_profiles` kolonları eksik ve `lost_found`/`chats`/`notifications` tabloları yok. Her alanda gerçek backend yüzeyi mobil repodaki `supabase/` migration'larından veya canlı projeden doğrulanmalı; web tiplerine körü körüne güvenilmez.

---

## 1. F0 hedefi ve kilitlenen kararlar

**Hedef:** Web'i, kullanıcının giriş yaptığı gerçek bir uygulamanın temeline dönüştürmek — üstüne 8 alanın oturacağı authed kabuk, route guard zinciri, tam auth/hesap katmanı ve mobil ile aynı marka.

**Kilitlenen kararlar (brainstorming):**

| Karar | Seçim |
|---|---|
| F0 kapsamı | **Geniş temel** (shell + auth + hesap katmanı tek döngüde) |
| Navigasyon | **Responsive** — mobilde alt tab bar, masaüstünde üst + yan nav |
| Marka | **Mobil ile aynı** — `AppPalette` token'ları web'e taşınır |
| Rota yapısı | **`app/(app)/` route group + mobil ile aynı yollar** (`/lost-found`, `/adoptions`...) |
| i18n | **Şimdilik TR-only** (çatı kurulmaz, `<html lang="tr">`) |
| Google Sign-In | **OAuth redirect** (`signInWithOAuth`, mevcut Apple kalıbı) |
| Onboarding | **İnce** — value-prop carousel yok; home-location edit-profile içinde |

---

## 2. Kapsam sınırları

**F0'da var:** authed app shell + responsive nav · route guard zinciri (middleware + layout) · Google Sign-In (OAuth) · email signup'a doğum tarihi + consent · `/complete-profile` (2 adım) · `/accept-consent` · home-location yakalama (edit-profile) · hesap/settings (edit-profile, change-password, blocked-users, delete-account, export-data, analytics-consent, tema geçişi) · marka/tema token'ları + Nunito font · `database.types.ts` yeniden üretimi (en az foundation kapsamı).

**Bilinçli ertelenenler (başka alanlara bağımlı — F0'da yok/stub):**
- Settings içindeki *bookmarks* (Posts/Adoptions), *my applications* (Adoptions), *accept-DMs toggle* (Chats), *notifications settings* (Notifications) → ilgili alan gelince açılır.
- Onboarding value-prop carousel + post-signup şehir adımı → L&F/Adoptions gelince (tek tüketici olan şehir-filtresi seeding'i o zaman var olur).
- "Bir kullanıcıyı engelle" aksiyonu (User alanında; F0 yalnızca engellenenler **listesi + unblock**).
- OneSignal / web push (Notifications alanı).

**Kapsam dışı:** herhangi bir içerik alanı (L&F browse, adoptions, posts, discussions, chats), Shorebird/force-update/in-app-review (web'de anlamsız), test runner kurulumu (opsiyonel, aşağıda).

---

## 3. Mimari

### 3.1 Routing & app shell

```
app/
  (public)                     # shell YOK, crawlable — mevcut public yüzey korunur
    page.tsx                   -> /                      (landing/hero)
    lost-found/item/[id]/...   -> public paylaşılabilir ilan (+ OG image)
    (support-pages), auth/*, (auth-pages), reset-password, home/reset-password
  (app)                        # authed shell + guard
    layout.tsx                 # responsive nav + gate zinciri (server)
    complete-profile/page.tsx  -> /complete-profile
    accept-consent/page.tsx    -> /accept-consent
    lost-found/page.tsx        -> /lost-found   (F0'da placeholder; içerik alanında dolar)
    adoptions/, chats/, profile/, ...   (placeholder; ilgili alanlarda dolar)
    profile/settings/, profile/edit/, profile/change-password/, profile/blocked/
```

- **Public/authed `/lost-found` bir arada:** browse `(app)/lost-found` (shell içinde, authed), paylaşılabilir `(public)/lost-found/item/[id]` (shell'siz, SEO). Route group'lar aynı URL uzayını çakışmadan böler.
- **`/home` geçişi:** eski `/home` uygulama girişine redirect'e döner (post-login hedefi `/lost-found`, mobil ile aynı). `/home/reset-password` yerinde kalır (recovery form).

### 3.2 Guard / gate zinciri

İki katman. **Otorite `(app)/layout.tsx`'tir** (route group'a özgü olduğu için hangi yolun authed olduğunu kesin bilir); middleware yalnızca cookie tazeleme + kaba yönlendirme yapar.

1. **`(app)/layout.tsx`** (server, otorite) — oturum yoksa → `/auth/login`; oturumlu kullanıcı için gate zinciri (mobil `resolveGateRedirect` mantığı):
   - `username == null` **ve** yol `/complete-profile`/`/accept-consent` değilse → `/complete-profile`
   - consent stale (`consent_accepted_at == null || tos_version != current || pp_version != current`) **ve** yol `/accept-consent` değilse → `/accept-consent`
   - `/reset-password` ve recovery oturumu **muaf** (eksik profil/consent ile bile şifre sıfırlanabilsin).
2. **`middleware.ts`** — `updateSession` her istekte kalır (cookie tazeleme). **Önemli:** middleware route group'ları göremez (grup URL'de yok); yalnızca gerçek URL önekleriyle çalışır. Kaba unauth redirect'i açık bir authed-önek listesiyle yapar (`/lost-found`, `/adoptions`, `/chats`, `/profile`, `/complete-profile`, `/accept-consent`, ...) ve **public alt-yolları hariç tutar** — özellikle guard'lı `/lost-found` (browse) ile public `/lost-found/item/[id]` (shell'siz, crawlable) ayrımı korunmalı. Nihai kararı yine layout verir; middleware sadece erken yönlendirmedir.

### 3.3 Tema / marka pariti

Mobil `lib/utils/app_palette.dart` → Tailwind + shadcn CSS değişkenleri (light + dark). Değerler (referans, birebir taşınır):

**Light:** `background #FAF6F1` · `foreground #2B2420` · `card/popover #FFFFFF` · **`primary #BE4E2B`** (terracotta) · `primary-fg #FFFFFF` · `secondary #F3E3D9` / `secondary-fg #8A4A2C` · `muted #F1EBE3` / `muted-fg #857A70` · `accent #F3E3D9` / `accent-fg #2B2420` · `destructive #DC2626` · `border/input #EAE0D7` · `ring #BE4E2B`

**Dark:** `background #17140F` · `foreground #F2EBE0` · `card/popover #221E18` · **`primary #E07A45`** · `primary-fg #211A10` · `secondary #2C2620` · `muted #241F19` / `muted-fg #A79C8C` · `accent #2E2820` · `destructive #F1705B` · `border/input #332C22` · `ring #E07A45`

**Semantic** (ayrı token seti): `success #22C55E`/dark `#4ADE80` · `warning #F59E0B`/`#FBBF24` · `gender-female #EC407A` · `gender-male #42A5F5` · `lost-urgent = primary` · `adopt-success #3F6B3A`/dark `#6E9E5E`

**Tipografi:** Geist → **Nunito** (`next/font/google`); mono JetBrains Mono (username alanı). **Radius:** sm4/md8/lg12/xl16/full999. **Spacing:** xs4/sm8/md16/lg24/xl32. Tema adları "Sıcak Toprak" (light) / "Sıcak Antrasit" (dark).

### 3.4 Veri katmanı & tipler

- **`database.types.ts` yeniden üretimi** canlı projeden (Supabase gen types). En az `user_private` tablosu + güncel `user_profiles` kolonları eklenmeli.
- Yeni `lib/` modülleri:
  - `lib/auth/actions.ts` — `googleSignInAction` (+ mevcut Apple/email genişletme), gate yardımcıları.
  - `lib/profile/` — `user_profiles` + `user_private` merge (mobil `mergeUserPrivateFields` mantığı); `user_private` **yalnızca current user için** (owner-only RLS).
  - `lib/consent.ts` — versiyon sabitleri (`TOS_VERSION='2026-05-23'`, `PP_VERSION='2026-07-19'`) + `needsConsentReprompt`.
  - `lib/theme/tokens` — renk/radius/spacing token'ları tek kaynak.
- Mevcut Supabase client seçim kalıbı (server/client/middleware) korunur.

---

## 4. Özellik spec'leri

### 4.1 Auth parity

- **Google:** `googleSignInAction` → `signInWithOAuth({ provider:'google', options:{ redirectTo: '${PUBLIC_URL}/auth/oauth?next=/lost-found', scopes:'email profile' }})` (Apple action'ıyla birebir aynı desen).
- **Apple / email:** mevcut. Email **signup** formu genişletilir: doğum tarihi (yaş kapısı) + consent onayı + opsiyonel analytics-consent alanları eklenir.
- **Consent yazımı:** web'de email-doğrulama öncesi oturum olmadığından consent signup'ta yazılamaz → **gate'li `/accept-consent`'te** yazılır (oturum garanti; mobil de orada topluyor). Mobildeki in-memory `PendingSignupContext` web'e taşınmaz.
- **SSO callback:** `/auth/oauth` başarıdan sonra profil satırı yoksa oluşturulur (`username=null`) ve gate zincirine bırakılır → yeni kullanıcı doğal olarak complete-profile → accept-consent akışına düşer.

### 4.2 `/complete-profile` (2 adım)

- **Adım 1 — username (zorunlu):** geri kapalı (mobil `PopScope`). Benzersizlik: RPC **`username_exists(p_username text) → bool`**, istemcide 400ms debounce; rezerve-isim kontrolü RPC içinde. Apple full-name'den öneri prefill (varsa).
- **Adım 2 — avatar + bio (opsiyonel):** avatar `<input type=file accept=image/*>` → istemci-tarafı sıkıştırma (canvas / `browser-image-compression`, ~q50) → **`assets`** bucket'a düz `<uuid>.<ext>` → `user_profiles.profile_photo`. Bio ≤160 char → `user_profiles.bio`. "Şimdilik geç" hiçbir şey yazmaz.
- Username'i olan mevcut kullanıcı Adım 1'i atlar. Bitince → `/lost-found`.
- **Yazımlar:** Adım 1: `user_profiles.username` UPDATE. Adım 2: `profile_photo` + `bio`.

### 4.3 `/accept-consent`

- **Versiyonlar:** `TOS_VERSION='2026-05-23'`, `PP_VERSION='2026-07-19'` (release-pinned, tek dosya `lib/consent.ts`).
- **Yazım (`user_private` UPSERT):** `consent_accepted_at` (timestamptz, UTC ISO), `tos_version`, `pp_version`, `birth_date`.
- **Re-prompt:** `consent_accepted_at yok || tos_version != TOS_VERSION || pp_version != PP_VERSION`.
- **Duvar UX:** geri yok; çıkışlar **accept / logout / delete-account**. Doğum tarihi **zorunlu** (yaş kapısı; kayıtlı `birth_date`'ten prefill). Opsiyonel analytics-consent → RPC `set_analytics_consent`. Accept sonrası profil reload → `/lost-found`.

### 4.4 Home-location (edit-profile içinde)

- `navigator.geolocation.getCurrentPosition` (HTTPS + izin) → mevcut **`reverse-geocode`** edge fonksiyonu (aynen) → şehir/ilçe eşleme (mobil `matchTurkeyCity/District` listeleri web'e taşınır) **veya** manuel şehir/ilçe seçici (fallback).
- **Saklama:** `user_private.home_city` / `home_district` (UPSERT) + `localStorage` (`home_city`/`home_district`). Precedence: profil kazanır → cihaza aynala.
- **Tüketici notu:** şehir-filtresi seeding'i (L&F/Adoptions) o alanlar gelene kadar aktif değil; F0 yalnızca yakalama + saklamayı kurar.

### 4.5 Hesap / settings

Kendi kendine yeten, F0'da tam:

| Öğe | Davranış / backend |
|---|---|
| Edit profile | bio, socials (x/instagram/telegram/tiktok/facebook), phone, avatar, home-location. Repo `{phone, home_city, home_district}` → `user_private`; gerisi → `user_profiles`. |
| Change password | mevcut şifre re-auth (`signInWithPassword`) → `updateUser({password})`. |
| Blocked users | `user_blockings` listesi (join `blocked_user_id`) + unblock (DELETE). |
| Delete account | onay ifadesi yazdırma + reauth (`reauth_gate` mantığı: email→şifre, sso→yeniden giriş) → edge fn `delete-authenticated-user` → signOut. (Web'de kısmen mevcut.) |
| Export data | edge fn `export-user-data` → JSON → **tarayıcı indirmesi** (mobildeki OS-share yerine). |
| Analytics consent | toggle → RPC `set_analytics_consent`. |
| Tema geçişi | light/dark (mevcut `next-themes`). |

**Stub (görünür değil / "yakında"):** bookmarks, my applications, accept-DMs, notifications settings.

---

## 5. Kullanılan Supabase yüzeyi (F0)

- **Tablolar:** `public.user_profiles`, `public.user_private` (owner-only RLS), `public.user_blockings`.
- **RPC:** `username_exists(p_username text)→bool`, `set_analytics_consent(enabled bool)`, (analytics için `log_events` opsiyonel).
- **Edge functions:** `delete-authenticated-user` (DELETE), `export-user-data` (POST), `reverse-geocode` (POST).
- **Storage:** `assets` bucket (avatar, düz `<uuid>.<ext>`, public URL).
- **Auth:** GoTrue — email/password, `signInWithOAuth` (google/apple), `resetPasswordForEmail`, `updateUser`.

---

## 6. Native → Web uyarlamaları

| Mobil | Web |
|---|---|
| Google native `signInWithIdToken` | `signInWithOAuth({provider:'google'})` redirect |
| `image_picker` + `flutter_image_compress` | `<input type=file>` + istemci canvas/kütüphane sıkıştırma |
| `geolocator` native | `navigator.geolocation` (HTTPS + izin) |
| `shared_preferences` (home_city/district) | `localStorage` |
| `PendingSignupContext` (in-memory) | Yok — consent accept-consent'te yazılır |
| OS share (export) | Tarayıcı indirmesi |
| `reverse-geocode` edge fn | Aynen kullanılır |

---

## 7. Riskler & non-obvious kısıtlar

- **Bayat tipler:** `database.types.ts` `user_private`'ı içermiyor → F0'ın ilk işi tip yeniden üretimi; aksi halde consent/home-location kolonları tip-güvenli değil.
- **`user_private` RLS owner-only:** merge yalnızca current user için; başka kullanıcının private alanları asla çekilmez.
- **Public/authed `/lost-found` çakışması:** route group ayrımı doğru kurulmazsa shell public ilan sayfasına sızabilir (SEO/OG bozulur). Public item sayfası shell'siz kalmalı.
- **Consent versiyon pinning:** sabitler kod içinde; bir sonraki tos/pp değişiminde bump edilmeli (mobil ile senkron kalmalı — kardeş proje kuralı).
- **Strict TS:** `noUncheckedIndexedAccess` + `noUnusedLocals/Parameters` → `next build`'i düşürür; ölü import bırakılmaz, `rows[0]!` kalıbı korunur.
- **`metadataBase` localhost'a düşmemeli** (mevcut kısıt) — shell değişiklikleri `app/layout.tsx` normalizasyonunu bozmamalı.
- **Kardeş senkron:** consent versiyonları, username kuralları, tema token'ları mobil ile aynı kaynaktan türer; sapma olursa mobil doğru referanstır.

---

## 8. Başarı kriterleri (doğrulanabilir)

1. Logout'ta herhangi bir `(app)` yoluna gidiş → `/auth/login`.
2. Email signup doğum tarihi + consent topluyor; doğrulama+login sonrası yeni kullanıcı username → consent → `/lost-found` akışını tamamlıyor.
3. Google + Apple + email üçü de gate zincirine doğru düşüyor (yeni kullanıcı → complete-profile).
4. `username_exists` ile benzersizlik ve rezerve-isim reddi çalışıyor (debounce'lu).
5. `tos_version`/`pp_version` bump edilince mevcut kullanıcı `/accept-consent`'e yönleniyor.
6. Responsive nav tüm `(app)` rotalarında (mobil alt tab / masaüstü üst-yan) render oluyor.
7. Tema mobil ile eşleşiyor: terracotta primary, Nunito, light/dark.
8. edit-profile / change-password / blocked-users / delete-account / export-data / analytics-consent uçtan uca çalışıyor.
9. Home-location edit-profile'da yakalanıp `user_private`'a yazılıyor.
10. `npm run build` (typecheck + lint) temiz.

**Doğrulama yöntemi:** Projede test runner yok → birincil doğrulama `npm run build` + manuel akış. Minimal bir test kurulumu (guard zinciri + `needsConsentReprompt` gibi saf mantık için) **opsiyonel** ve F0 kapsamı dışı; istenirse ayrı ele alınır.

---

## 9. Açık noktalar (plan aşamasında netleşecek, tasarımı bloklamaz)

- `database.types.ts` yeniden üretimi için erişim yolu (Supabase CLI `gen types` mi, mobil `supabase/` migration'larından türetme mi).
- Responsive nav'ın masaüstünde "üst mü yan mı" nihai düzeni (frontend-design aşamasında; her ikisi de kabul edilen kararla uyumlu).
- İstemci-tarafı görsel sıkıştırma kütüphanesi seçimi (canvas elle vs `browser-image-compression`).
