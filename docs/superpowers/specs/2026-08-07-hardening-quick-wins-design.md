# Hardening + Quick Wins — Tasarım Spec'i

**Tarih:** 2026-08-07
**Kapsam:** Tek shippable spec. Beş kesişen konunun (image/cache, performans, hata yönetimi, loglama, güvenlik) en yüksek getirili, düşük riskli dilimini toplar.

## Bağlam ve mevcut durum (doğrulanmış gerçekler)

Uygulama ~10k satırlık aktif "web parite" hali: adoptions, chats (realtime), emergency, lost-found (tam CRUD), notifications, profile, reports, trust. Stack **Next 16.3.0 + React 19.2.8 + Tailwind v4** (CLAUDE.md "Next 15 / Tailwind 3" der — bayat).

**Zaten sağlam (dokunulmuyor):** Auth/veri güvenliği güçlü. Her server action `getUser()` ile yeniden doğruluyor, yazımlar `user.id`'ye göre kapsanıyor, repo'da `service_role` yok (yetkili işler edge function'da), open-redirect savunması (`safeNextPath`) ve sosyal URL allowlist mevcut, public RPC bilinçli minimal (owner/iletişim/CIP sızmıyor). Rate limit DB/edge tarafında var.

**Kapatılacak gerçek boşluklar:**
1. Public sayfalarda sıfır cache — `createClient()` → `cookies()` sayfayı dynamic'e zorluyor; her istekte RPC + Satori PNG üretiliyor.
2. Sıfır gözlemlenebilirlik — 60 ham `console.error`, logger/Sentry/`instrumentation.ts` yok; hiç `error.tsx` yok; `getLostFoundById` hatayı loglamadan null dönüyor.
3. Sıfır güvenlik header'ı — CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy hiçbiri yok.
4. Somut bug: `forgotPasswordAction`'daki `callbackUrl` doğrulanmadan redirect ediliyor (open redirect).

## Hedefler

Yukarıdaki 4 boşluğu + görsel CLS/bant genişliği acısını, auth/veri katmanına dokunmadan, düşük riskli ve yakında shippable bir dilimde kapatmak.

## Workstream'ler

### 1. Public sayfa cache'i (OG ISR + veri cache)
- **Amaç:** En pahalı işleri id başına bir kez yapmak: (a) OG görselinin Satori PNG üretimi (crawler'lar defalarca çeker), (b) public RPC okuması.
- **Fizibilite notu (doğrulandı):** Tam sayfa ISR mümkün değil — sayfa HTML'i iki gerçek per-user okumayla dynamic kalıyor: `page.tsx:110-111`'in kendi `getUser()`'ı (`currentUserId` → Report/`EntityActionMenu`) ve `(public)/layout.tsx → HeaderAuth`'un `getUser()`'ı (nav auth durumu). Bunları kaldırmak layout/auth refactor'u — bu spec'in dışında (Kapsam dışı'na eklendi).
- **Yaklaşım:**
  - Cookie'siz anon Supabase client ekle (plain `@supabase/supabase-js`, session yok). Veri user-specific değil, cookie gereksiz.
  - `getLostFoundById`'ı bu anon client + `unstable_cache` ile sar: `revalidate: 60`, `tags: ['lf-' + id]`. Sayfa, OG ve `generateMetadata` hepsi bunu kullanır → DB hit id başına 60s'de en çok bir kez.
  - `opengraph-image.tsx` → `export const revalidate = 60`. Tek dynamic okuması artık cookie-free + cache'li olduğundan static/ISR olur (Satori PNG cache'lenir).
  - `page.tsx` → dynamic kalır (getUser + nav), ama DB okuması artık cache'li — bu bilinçli.
  - Mutation'larda (`markReunited`, `reactivate` — `lib/lost-found/actions.ts`) `revalidateTag('lf-' + id)` ile anında bust.
- **Neden 60s:** `revalidateTag` yalnızca web mutation'ında tetiklenir; mobil/API kaynaklı statü değişikliği yalnızca zaman-tabanlı `revalidate` ile yakalanır. 60s viral burst'ü emerken statü bayatlığını 1 dakikayla sınırlar.
- **Dosyalar:** `lib/lost-found.ts` (anon client + `unstable_cache`), `app/(public)/lost-found/item/[id]/opengraph-image.tsx` (`revalidate`), `lib/lost-found/actions.ts` (`revalidateTag`).
- **Uygulama sırasında doğrula:** `opengraph-image.tsx`'in `revalidate` export'unu onurlandırdığı — build çıktısında OG route'unun static/ISR (`○`/`ISR`) işaretlendiğini kontrol et; metadata image route'ları segment config'i farklı işleyebilir.
- **Risk:** Düşük. Bayatlık 60s ile sınırlı; sayfa HTML'i değişmez (yalnızca DB kaynağı + OG cache'lenir).

### 2. Güvenlik header'ları (güvenli beşli)
- **Amaç:** Temel güvenlik header'larını sıfır kırılma riskiyle eklemek.
- **Yaklaşım:** `next.config.ts` → `async headers()`, tüm route'lara: HSTS, X-Frame-Options: `DENY` (uygulama hiçbir yere gömülmüyor), X-Content-Type-Options: nosniff, Referrer-Policy (`strict-origin-when-cross-origin`), Permissions-Policy. Permissions-Policy'de Maps için `geolocation=self` bırakılır; kamera/mikrofon/ödeme kapatılır.
- **Dosya:** `next.config.ts`.
- **Kapsam dışı:** CSP — Maps + Turnstile + Supabase-realtime allowlist + nonce plumbing gerektirir; kendi spec'i.

### 3. Minimal gözlemlenebilirlik ağı
- **Amaç:** Beyaz-ekran, sessiz env hatası ve sessiz-null gibi gerçek boşlukları ucuza kapatmak.
- **Yaklaşım:**
  - `app/global-error.tsx` + `app/error.tsx` — dostça fallback UI + "tekrar dene" (reset).
  - Fail-loud env doğrulaması: `instrumentation.ts` `register()` içinde zorunlu env var'ları assert et (eksikse boot patlasın). (Alternatif: küçük `lib/env.ts`.) Zorunlu liste: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
  - `getLostFoundById` hatada `console.error` ile loglasın (kardeşleriyle tutarlı).
- **Kapsam dışı:** Sentry/monitoring (KVKK/PII kararı + hesap/maliyet → kendi spec'i) ve logger framework (YAGNI; `console.error` çalışıyor, Netlify yakalıyor).
- **Dosyalar:** `app/global-error.tsx`, `app/error.tsx`, `instrumentation.ts`, `lib/lost-found.ts`.

### 4. Open-redirect fix
- **Amaç:** Doğrulanmamış client-supplied redirect target'ı kapatmak.
- **Yaklaşım:** `forgotPasswordAction`'daki `callbackUrl`'ı var olan `safeNextPath()`'ten geçir.
- **Dosya:** `app/actions.ts` (`:96,115-117` civarı).

### 5. Görsel quick-win (dar kapsam)
- **Amaç:** Browse listelerindeki CLS + bant genişliği acısını gidermek.
- **Yaklaşım:** Public listing sayfası + 3 browse kartı (`components/lost-found/lf-listing-card.tsx`, `components/adoptions/adoption-card.tsx`, `components/emergency/emergency-card.tsx`): `loading="lazy"` + `decoding="async"` + `aspect-ratio` kutusu (yeri rezerve edip CLS'i öldürür). Ham `<img>` kalır.
- **Kapsam dışı:** `next/image` migration (bilinçli remotePatterns WIP çakışması) ve form/avatar/chat görselleri.

## Kapsam dışı (bilinçli ertelenen, gelecekteki spec'ler)
- CSP (kendi spec'i — Maps/Turnstile/Supabase-realtime allowlist + nonce).
- `next/image` migration + `images.remotePatterns`.
- Sentry / monitoring (KVKK/PII kararı).
- Logger framework / structured logging.
- App-layer rate limiting (DB/edge yeterli).
- Mobil/API'den webhook ile tag-revalidation (anlık tazelik; kardeş repo'lara dokunur).
- Görsel sweep: form önizlemeleri, avatarlar, chat baloncukları.
- Tam sayfa ISR (listing HTML'inin CDN cache'i): `HeaderAuth`'u client-side yapma + listing route'una auth-nav'sız yalın layout + `currentUserId`'yi client island'a taşıma gerektirir; ayrı iş.

## Başarı kriterleri
1. OG görseli 60s içindeki tekrar isteklerde ISR cache'inden geliyor (Satori PNG yeniden üretilmiyor); `getLostFoundById` DB'ye id başına 60s'de en çok bir kez gidiyor; `markReunited`/`reactivate` ilgili `lf-<id>` tag'ini anında patlatıyor. (Sayfa HTML'i dynamic kalır — bilinçli.)
2. Beş güvenlik header'ı tüm cevaplarda mevcut (`curl -I` ile doğrulanır).
3. Bir sayfada throw → beyaz ekran değil fallback UI; eksik zorunlu env → boot'ta gürültülü hata; `getLostFoundById` hatada logluyor.
4. Harici `callbackUrl` ile forgot-password akışı site içinde kalıyor (open redirect kapalı).
5. Browse kartları lazy yükleniyor ve aspect-ratio yeri rezerve ettiği için CLS yok.

## Riskler / dikkat
- Cache: Sayfa HTML'i bilinçli dynamic kalıyor (per-user nav + Report); yalnızca OG PNG + DB okuması cache'leniyor. `unstable_cache` içindeki fonksiyon cookie okuyamaz — bu yüzden cache'lenen okuma zorunlu olarak cookie-free anon client kullanır.
- Header: Permissions-Policy'de Maps'in ihtiyaç duyduğu izin (`geolocation=self`) kırılmamalı — uygulama sırasında map route'ları duman testinden geçirilmeli.
- Env doğrulaması: `NEXT_PUBLIC_*` var'lar build-time'da gömülür; boot-time assert bunların varlığını build/başlangıçta doğrular.
