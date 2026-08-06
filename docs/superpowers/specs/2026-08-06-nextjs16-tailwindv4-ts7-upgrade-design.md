# Bağımlılık upgrade tasarımı — Next.js 16 + Tailwind v4 + TypeScript 7

**Tarih:** 2026-08-06
**Durum:** Onaylı tasarım (implementasyon planı bekliyor)

## Amaç

Patify-nextjs'i kullandığı tüm major bağımlılıklarıyla birlikte son sürümlere yükseltmek — **kırılma yaratmadan**. Kullanıcı Next.js 16'yı özellikle istiyor ve kapsamı "her şey son sürüme (TS 7 dahil)" olarak seçti.

## Başlangıç durumu (doğrulanmış gerçekler)

- Node **22.23.1**, npm 10.9.8. Netlify deploy hedefi de **Node 22** (`.netlify/functions/manifest.json` → `nodejs22.x`).
- `next@15.5.22`, `react@19.2.8`, `react-dom@19.2.8`, `typescript@5.7.2`, `tailwindcss@3.4.17`.
- **Next 16'nın en sert kırıcı değişiklikleri bu projede zaten temiz:** tüm `cookies()/headers()` await'li; tüm `params/searchParams` `Promise` tipli ve await'li. Caching API yok, parallel route yok, AMP yok, `serverRuntimeConfig` yok. `next.config.ts` sade (`optimizePackageImports`, `images.formats`, `compress`, `poweredByHeader`), **webpack config yok**.
- `middleware.ts`: edge runtime **beyan edilmemiş**, Node'da çalışır. Netlify yine de edge-function'a derliyor (adapter davranışı).
- Tek `next/image` importu: `components/hero.tsx:1`. Gerisi bilinçli `<img>`.
- shadcn/ui kurulumu: Radix + CVA + `tailwind-merge` + `tailwindcss-animate`, `tailwind.config.ts`'te HSL CSS-var renkleri, `globals.css`'te `@tailwind` direktifleri + `@apply`.
- `tsconfig.json`: `moduleResolution: "node"`, `paths` `baseUrl`'süz (TS 7 uyumlu), `target ES2020`, `strict` + `noUncheckedIndexedAccess` + `noImplicitReturns` + `noUnusedLocals` + `noUnusedParameters`.

## Dış bağımlılık teyitleri

- **Netlify:** Next.js 16 tam destekli; adapter kaynak kodda pinli değil (`netlify.toml` yok) → Netlify en güncel v5'i otomatik kullanır. Deploy'da değişiklik gerekmez. **Karar: adapter'ı pinleme.**
- **TS 7 + Next:** Next.js **16.3** (2026-08-03) `next build`'de proje-yerel `tsc` CLI ile TS 7 typecheck'i destekliyor (default). `latest` next = 16.3.0. TS 7 = TS 6 semantiği + TS 6 default'ları/deprecated-flag hard-error'ları. Programatik API 7.1'e kadar yok → `typescript`'i import eden araçlar (typescript-eslint type-aware) kırılabilir; ama Next 16 `next build`'de lint çalıştırmadığı ve proje ayrı tsc çalıştırmadığı için bu risk düşük.

## Kararlar (grilling ile netleşen)

| Karar | Seçim | Gerekçe |
|---|---|---|
| Kapsam | Her şey son sürüme, TS 7 dahil | Kullanıcı seçimi |
| Sıralama | Aşamalı, tek branch, aşama başına doğrulama | "breaking yaratmadan"ın tek gerçekçi yolu |
| Sıra | Next 16 → küçük major'lar → Tailwind v4 → TS 7 | Riski en sona, en taze entegrasyonu (TS 7) sona koy |
| Doğrulama barı | `npm run build` + claude-in-chrome tam tıklama turu (her aşama) | Test runner yok; Tailwind'in görsel/dark-mode kırılmasını build yakalamaz |
| Tailwind config | Tam CSS-first (`@theme inline`) | Kanonik v4, shadcn'in belgelediği yol |

## Prensipler

1. Tek feature branch; aşama başına tek commit.
2. Her aşamadan sonra: `npm run build` yeşil **ve** tarayıcıda kritik rota turu (ışık + dark mode).
3. **Kritik rotalar:** public LF ilan `/lost-found/item/[id]` + OG görsel, login (`/auth/login`), home shell (auth'lu), dark mode toggle.
4. Bir aşama kırılıp hızlı düzelmezse → o commit tek başına geri alınır; önceki aşamalar durur.

## Aşama 1 — Next.js 16 (düşük risk)

- **Paket:** `next@16.3.0`. React/react-dom **dokunulmaz** (19.2.8 zaten Next 16'nın minimumunu karşılıyor).
- **İşler:**
  - `npx @next/codemod@latest upgrade` (mekanik geçişler).
  - `next.config.ts`: `optimizePackageImports`'u `experimental`'dan üst seviyeye taşı (opsiyonel, düşük öncelik).
  - `components/hero.tsx` — `next/image` remote src mi kontrol et; gerekirse `images.remotePatterns` ekle veya `<img>`'e çevir.
  - `middleware.ts` **korunur** (deprecate ama 16'da çalışıyor; `proxy.ts` Node-only + Netlify edge ile riskli → ertele).
  - Build zaten Turbopack'e geçer; webpack config olmadığı için sorunsuz.
- **Not:** Next 16'da `next build` ESLint çalıştırmaz. Ayrı lint script'i yok → kayıp nötr.
- **Doğrulama:** build + kritik rota turu.

## Aşama 2 — Küçük major'lar

- **`lucide-react@1.29`:**
  - `npx @lucide/codemod@latest migrate-from-0.x` (ikon rename'leri).
  - **Brand ikon taraması** (Github, Facebook, Instagram vb. v1'de kaldırıldı) — kullanılıyorsa Simple Icons / özel SVG ile değiştir.
  - Rename'ler: `XCircle`→`CircleX`, `AlertCircle`→`CircleAlert`, `ExternalLink`→`SquareArrowOutUpRight` vb. Eksik export = TS hatası → build yakalar.
- **`react-markdown@10`:** tek kırıcı değişiklik `className` prop'unun kaldırılması. Kullanıldığı yeri (support sayfaları) `<div className>` sarmalına çevir. Build yakalar.
- **Doğrulama:** build + kritik rota turu + support/legal sayfa render kontrolü.

## Aşama 3 — Tailwind v4 (CSS-first) — en görsel riskli

- **Paketler:** `tailwindcss@4`, `@tailwindcss/postcss` (yeni), `tailwind-merge@3`; `autoprefixer` **kaldır** (v4 kendi yapıyor); `tailwindcss-animate` → **`tw-animate-css`**; `@tailwindcss/typography` v4-uyumlu sürüme.
- **İşler:**
  1. `npx @tailwindcss/upgrade` — mekanik geçişlerin bulk'u (config→CSS, utility rename'leri). Sonrasında araç kaçırdıklarını elle tamamla.
  2. `postcss.config.js`: `tailwindcss` + `autoprefixer` → `@tailwindcss/postcss`.
  3. `globals.css`: `@tailwind base/components/utilities` → `@import "tailwindcss"`.
  4. Tokenları **`@theme inline`**'a taşı; shadcn renk değişkenlerini **HSL raw-channel → tam OKLCH** çevir; `--color-*` prefix'i ekle (yoksa `bg-primary`/`text-foreground` çözülmez). `:root` ve `.dark`'ı `@layer base`'ten çıkar.
  5. Dark mode: `@custom-variant dark` ekle (v4 class stratejisi için şart). `next-themes`/`ThemeProvider` **değişmez**.
  6. `tailwind.config.ts` kaldırılır (content auto-detect). `tailwindcss-animate` plugin'i → `tw-animate-css` `@import`.
  7. className string'lerindeki yeniden adlanan utility'ler: `ring`→`ring-3`, `outline-none`→`outline-hidden`, `bg-gradient-to-*`→`bg-linear-to-*`, `shadow-sm`→`shadow-xs` vb. (araç + elle; JS string-match hatalarına dikkat).
- **Tarayıcı desteği notu:** v4 Safari 16.4+/Chrome 111+/Firefox 128+ ister. Kabul edildi.
- **Doğrulama:** build + **her rotayı ışık ve dark mode ile gözle tara** (renk, accordion/dialog/dropdown animasyonları, chart renkleri yoksa atla).

## Aşama 4 — TypeScript 7 (en son, en taze)

- **Paket:** `typescript@7.0.2`. `@types/node` **22'de kalır** (Node 22 runtime'ıyla major eşleşmesi; 26 yanlış olur).
- **İşler:**
  - `tsconfig.json`: `moduleResolution: "node"` → **`"bundler"`**.
  - `types` default'u `[]`'e döndüğü için global tipler (`process` vb.) kaybolursa `types` veya ilgili ayarı ekle — build çıktısı gösterir.
- **Nasıl:** Next 16.3 `next build`'i proje-yerel `tsc` CLI ile TS 7 typecheck yapar (default; ek config gerekmez).
- **Fallback:** entegrasyon çok taze; kırılırsa `typescript@6`'ya (veya 5.7'ye) düş, önceki 3 aşama korunur.
- **Doğrulama:** `npm run build` (TS 7 tsc CLI temiz) + kritik rota turu.

## Bilinçli kapsam dışı

- **React Compiler** (Next 16 + React 19.2 ile açılabilir) — upgrade'in parçası değil; ayrı opsiyonel iş.
- **`middleware`→`proxy` rename** — 16'da middleware deprecate ama çalışıyor; proxy Node-only ve Netlify edge derlemesiyle riskli. Ertelendi.
- **`@types/node` 26** — runtime Node 22 olduğundan 22'de kalır.

## Başarı kriterleri

1. `npm run build` her 4 aşamada da yeşil; son durumda `next@16.3`, `tailwindcss@4`, `typescript@7` yüklü.
2. Kritik rotalar (public LF ilan + OG görsel, login, home shell) ışık ve dark mode'da görsel/işlevsel regresyonsuz.
3. Her aşama ayrı commit; herhangi biri tek başına geri alınabilir durumda.
4. Netlify adapter'ı pinlenmemiş; deploy config değişmemiş.
5. Bilinçli kapsam dışı bırakılanlar dışında `npm outdated` major açığı kalmamış (`@types/node` hariç — kasıtlı 22).
