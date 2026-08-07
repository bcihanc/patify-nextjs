# Hardening + Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapatılacak dört gerçek boşluk (public cache, güvenlik header'ları, minimal gözlemlenebilirlik, open-redirect) + bir görsel quick-win'i, auth/veri katmanına dokunmadan uygulamak.

**Architecture:** Altı bağımsız, tek tek test edilebilir görev. Workstream 1 (cache) OG görselini ISR'lar ve public RPC okumasını `unstable_cache` ile 60s cache'ler; sayfa HTML'i bilinçli dynamic kalır. Diğerleri config/UI dokunuşları.

**Tech Stack:** Next 16.3.0 (App Router), React 19.2.8, TypeScript 6 (strict + `noUncheckedIndexedAccess`), `@supabase/supabase-js` + `@supabase/ssr`, `next/cache` (`unstable_cache`, `revalidateTag`), Netlify (`@netlify/plugin-nextjs` v5).

## Global Constraints

- **Test runner YOK.** package.json'da test/lint script'i yok; doğrulama `npm run build` (tip + ESLint) + hedefli manuel kontroller (grep, `curl -I`, build çıktısı). Test framework EKLEME (scope dışı).
- **Strict TS ötesi:** `noUncheckedIndexedAccess` (dizi erişimi `T | undefined` → `rows[0]!` idiom'u koru), `noUnusedLocals`, `noUnusedParameters` → **kullanılmayan import/değişken `next build`'i patlatır; ölü import'ları düş.**
- **Kullanıcıya dönük tüm metin Türkçe.** Kod/identifier orijinal.
- **Ham `<img>` bilinçli** — `next/image`'a GEÇME (remotePatterns WIP çakışması).
- **`unstable_cache` içindeki fonksiyon `cookies()`/`headers()` OKUYAMAZ** → cache'lenen okuma zorunlu olarak cookie-free anon client kullanır.
- Her görev sonunda `npm run build` yeşil olmalı ve ilgili manuel kontrol geçmeli.

---

### Task 1: Public listing cache (anon client + unstable_cache + OG ISR + tag bust)

Workstream 1'in tamamı + `getLostFoundById` sessiz-null log fix'i. Tek deliverable: public okuma cache'li, OG görseli ISR, mutation cache'i patlatıyor.

**Files:**
- Modify: `lib/lost-found.ts` (anon client + `unstable_cache` sarımı + hata logu; eski cookie import'unu düş)
- Modify: `app/(public)/lost-found/item/[id]/opengraph-image.tsx` (revalidate export)
- Modify: `lib/lost-found/actions.ts:135-153` (markReunited + reactivate → `revalidateTag`)

**Interfaces:**
- Produces: `getLostFoundById(id: string): Promise<LostFoundListing | null>` — imza **değişmez**; içi artık cache'li + cookie-free. Cache tag'i: `` `lf-${id}` ``.
- Consumes: mevcut `RpcRow`, `toImageUrl`, `LostFoundListing` (aynı dosya, değişmiyor).

- [ ] **Step 1: `lib/lost-found.ts` — import'ları değiştir**

`import { createClient } from '@/lib/supabase/server'` satırını SİL (artık kullanılmıyor → `noUnusedLocals` patlar). Dosyanın en üstüne ekle:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
```

- [ ] **Step 2: cookie-free anon client helper'ı ekle**

`toImageUrl` tanımından sonra ekle:

```ts
// Cookie-free anon client for PUBLIC reads. No session → callable inside
// unstable_cache (which forbids cookies()/headers()). Data is not user-specific.
function anonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}
```

- [ ] **Step 3: `getLostFoundById`'ı cache'li + cookie-free hale getir**

Mevcut `getLostFoundById` gövdesini (satır 63-90) tamamen bununla değiştir:

```ts
export async function getLostFoundById(
  id: string,
): Promise<LostFoundListing | null> {
  const load = unstable_cache(
    async (): Promise<LostFoundListing | null> => {
      const supabase = anonClient()
      const { data, error } = await supabase
        .rpc('get_lost_found_by_id', { p_id: id })
        .returns<RpcRow[]>()

      if (error) {
        // Önceden sessizce null dönüyordu — RPC hatası 404'ten ayırt edilemiyordu.
        console.error('getLostFoundById:', error.message)
        return null
      }
      if (!data || data.length === 0) return null

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const r = data[0]!
      return {
        id: r.id,
        type: r.type,
        breed: r.breed,
        color: r.color,
        gender: r.gender,
        city: r.city,
        district: r.district,
        status: r.status,
        lostDate: r.lost_date,
        description: r.description,
        images: r.images?.map(toImageUrl) ?? null,
      }
    },
    ['lf-by-id', id],
    { revalidate: 60, tags: [`lf-${id}`] },
  )
  return load()
}
```

- [ ] **Step 4: OG görseline revalidate ekle**

`app/(public)/lost-found/item/[id]/opengraph-image.tsx` içinde, mevcut `export const alt = ...` satırının (satır 7) hemen altına ekle:

```ts
// getLostFoundById artık cookie-free + cache'li → bu route ISR olabilir.
export const revalidate = 60
```

- [ ] **Step 5: mutation'larda tag'i patlat**

`lib/lost-found/actions.ts` en üstüne (satır 3 civarı, mevcut import'ların yanına) ekle:

```ts
import { revalidateTag } from 'next/cache';
```

`markReunitedAction` içinde başarılı dönüşü (satır 143 `return { ok: true };`) şununla değiştir:

```ts
  revalidateTag(`lf-${id}`);
  return { ok: true };
```

`reactivateListingAction` içinde başarılı dönüşü (satır 152 `return { ok: true };`) şununla değiştir:

```ts
  revalidateTag(`lf-${id}`);
  return { ok: true };
```

- [ ] **Step 6: build + ISR doğrulaması**

Run: `npm run build`
Expected: PASS (tip/ESLint temiz). Build route tablosunda `/(public)/lost-found/item/[id]/opengraph-image` satırının `ƒ (Dynamic)` DEĞİL, ISR/`○` işaretli olduğunu doğrula (revalidate değeri görünür). Kullanılmayan import kalmadığından emin ol.

- [ ] **Step 7: Commit**

```bash
git add lib/lost-found.ts app/(public)/lost-found/item/[id]/opengraph-image.tsx lib/lost-found/actions.ts
git commit -m "perf(lost-found): cache public read (unstable_cache 60s) + ISR OG image + tag bust on reunite/reactivate"
```

---

### Task 2: Güvenlik header'ları (güvenli beşli)

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Produces: Tüm route'lara 5 response header'ı. Başka görev tüketmiyor.

- [ ] **Step 1: `async headers()` ekle**

`next.config.ts` içindeki `nextConfig` nesnesine, `agentRules: false,` satırından sonra ekle:

```ts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // geolocation=self: Maps radius/"yakınımda" özelliği için gerekli.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
        ],
      },
    ];
  },
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: header + maps smoke (dev)**

Run: `npm run dev` (ayrı terminal), sonra `curl -sI http://localhost:3000/ | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy'`
Expected: Beş header da listeleniyor.
Ayrıca bir map route'unu (`/adoptions/map` veya `/lost-found/map`) tarayıcıda aç → harita yükleniyor, konsol'da Permissions-Policy `geolocation` ihlali YOK.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "security: add baseline security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)"
```

---

### Task 3: Fail-loud env doğrulaması

**Files:**
- Create: `instrumentation.ts` (repo kökü — `app/`, `lib/` ile aynı seviye)

**Interfaces:**
- Produces: Sunucu başlangıcında zorunlu env eksikse `throw`. Başka görev tüketmiyor.

- [ ] **Step 1: `instrumentation.ts` oluştur**

```ts
// Next.js her sunucu başlangıcında bir kez çağırır. Zorunlu env eksikse
// sessizce `undefined` string'e girmesindense burada gürültüyle patla.
export async function register() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'PUBLIC_URL',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Eksik zorunlu env değişkeni: ${missing.join(', ')}`);
  }
}
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: PASS (env'ler `.env`'de mevcut olduğundan register hata atmaz).

- [ ] **Step 3: fail-loud smoke**

Run: `PUBLIC_URL= npm run dev` (PUBLIC_URL'i boşa zorla)
Expected: Sunucu başlarken `Eksik zorunlu env değişkeni: PUBLIC_URL` ile patlıyor. Doğruladıktan sonra normal `npm run dev` ile tekrar çalıştığını gör.

- [ ] **Step 4: Commit**

```bash
git add instrumentation.ts
git commit -m "chore: fail loud on missing required env vars via instrumentation register()"
```

---

### Task 4: Error boundary'ler (fallback UI)

**Files:**
- Create: `app/global-error.tsx` (kök layout hataları — kendi `<html>/<body>`'sini render eder)
- Create: `app/error.tsx` (segment-level render hataları)

**Interfaces:**
- Produces: Render throw'unda beyaz ekran yerine fallback + "tekrar dene". Başka görev tüketmiyor.

- [ ] **Step 1: `app/global-error.tsx` oluştur**

```tsx
'use client';

// Kök layout'ta bile patlarsa devreye girer → kendi <html>/<body>'sini içerir.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Bir şeyler ters gitti</h1>
        <button onClick={() => reset()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc' }}>
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: `app/error.tsx` oluştur**

```tsx
'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Bir şeyler ters gitti</h2>
      <button onClick={() => reset()} className="rounded-md border px-4 py-2">
        Tekrar dene
      </button>
    </div>
  );
}
```

Not: `error` prop'u tip imzasında var ama destructure edilmiyor (kullanılmıyor) — bu `noUnusedParameters`'ı tetiklemez (destructure edilmemiş nesne özelliği, kullanılmayan parametre değil). Component adını `Error` KOYMA (global `Error` tipiyle karışır).

- [ ] **Step 3: build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: fallback smoke**

`npm run dev` ile herhangi bir sayfada geçici olarak `throw new Error('test')` ekleyip sayfayı aç → beyaz ekran değil, "Bir şeyler ters gitti" + "Tekrar dene" görünüyor. Sonra geçici throw'u geri al.

- [ ] **Step 5: Commit**

```bash
git add app/global-error.tsx app/error.tsx
git commit -m "feat: add global-error and error boundaries with retry fallback UI"
```

---

### Task 5: Open-redirect fix (forgotPasswordAction)

**Files:**
- Modify: `app/actions.ts:115-117` (`forgotPasswordAction` içindeki `callbackUrl` redirect'i)

**Interfaces:**
- Consumes: `safeNextPath(raw: string | null | undefined): string | null` — `@/lib/auth/next-path`. `app/actions.ts` bunu `signInAction`'da zaten import ediyor; yeni import gerekmeyebilir (doğrula).

- [ ] **Step 1: import'u doğrula/ekle**

`app/actions.ts` üstünde `safeNextPath` import'u var mı kontrol et (signInAction kullanıyor). Yoksa ekle:

```ts
import { safeNextPath } from '@/lib/auth/next-path';
```

- [ ] **Step 2: `callbackUrl`'i doğrulamadan geçir**

`forgotPasswordAction` içindeki şu bloğu (satır 115-117):

```ts
    if (callbackUrl) {
        return redirect(callbackUrl);
    }
```

bununla değiştir:

```ts
    const safeCallback = safeNextPath(callbackUrl);
    if (safeCallback) {
        return redirect(safeCallback);
    }
```

(Harici/mutlak `callbackUrl` → `safeNextPath` null döner → aşağıdaki başarı `encodedRedirect`'ine düşer. Doğru güvenli davranış.)

- [ ] **Step 3: build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: mantık doğrulaması (grep)**

Run: `grep -n "safeNextPath(callbackUrl)" app/actions.ts`
Expected: eşleşme var. Ham `redirect(callbackUrl)` artık YOK: `grep -n "redirect(callbackUrl)" app/actions.ts` → boş.

- [ ] **Step 5: Commit**

```bash
git add app/actions.ts
git commit -m "security: validate forgotPassword callbackUrl through safeNextPath (close open redirect)"
```

---

### Task 6: Browse kartlarında lazy/async görsel

CLS zaten `aspect-square` kapsayıcıyla çözülü — bu görev yalnızca `loading="lazy"` + `decoding="async"` ekler (off-screen bant genişliği + decode kazancı).

**Files:**
- Modify: `components/lost-found/lf-listing-card.tsx:40`
- Modify: `components/adoptions/adoption-card.tsx:27`
- Modify: `components/emergency/emergency-card.tsx:20`

**Interfaces:** Yok (izole UI dokunuşu).

- [ ] **Step 1: `lf-listing-card.tsx`**

Satır 40'ı:

```tsx
          <img src={photo} alt={title} className="h-full w-full object-cover" />
```

şununla değiştir:

```tsx
          <img src={photo} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
```

- [ ] **Step 2: `adoption-card.tsx`**

Satır 27'yi (yukarıdakiyle birebir aynı içerik) aynı şekilde değiştir — `loading="lazy" decoding="async"` ekle.

- [ ] **Step 3: `emergency-card.tsx`**

Satır 20'yi değiştir (bu kart `src={item.photoUrl}` kullanır):

```tsx
          <img src={item.photoUrl} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
```

- [ ] **Step 4: build + grep doğrulaması**

Run: `npm run build`
Expected: PASS.
Run: `grep -rn 'loading="lazy"' components/lost-found/lf-listing-card.tsx components/adoptions/adoption-card.tsx components/emergency/emergency-card.tsx`
Expected: üç dosyada da eşleşme.

- [ ] **Step 5: Commit**

```bash
git add components/lost-found/lf-listing-card.tsx components/adoptions/adoption-card.tsx components/emergency/emergency-card.tsx
git commit -m "perf: lazy-load + async-decode browse card images"
```

---

## Self-Review

**Spec coverage:**
- Workstream 1 (OG ISR + veri cache) → Task 1. ✓ (sessiz-null log fix de Task 1'e katıldı)
- Workstream 2 (güvenli beşli header) → Task 2. ✓
- Workstream 3 (env doğrulama + error boundary + log fix) → Task 3 (env) + Task 4 (boundary) + Task 1 (log). ✓
- Workstream 4 (open-redirect) → Task 5. ✓
- Workstream 5 (görsel) → Task 6. ✓
- Kapsam dışı maddeler (CSP, next/image, Sentry, logger framework, full-page ISR): hiçbir görev bunlara girmiyor. ✓

**Placeholder scan:** TBD/TODO yok; her kod adımı tam içerik. ✓

**Type consistency:** `getLostFoundById` imzası korunuyor; `revalidateTag`/`unstable_cache`/`revalidate` `next/cache` ve route segment API'leri; `safeNextPath` imzası `next-path.ts`'ten birebir. ✓

**Not (spec'ten sapma, doğrulanmış):** Spec workstream 5 "aspect-ratio kutusu ekle" diyordu; kod incelemesinde kartların zaten `aspect-square` kapsayıcıda olduğu görüldü → CLS zaten çözülü, görev yalnızca lazy/async ekliyor. Başarı kriteri #5 (lazy + CLS-yok) yine karşılanıyor.
