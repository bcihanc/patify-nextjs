# Patify bağımlılık upgrade — Next 16 + Tailwind v4 + TS 7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patify-nextjs'i Next.js 16 + Tailwind v4 + TypeScript 7 dahil tüm major bağımlılıklarıyla, kırılma yaratmadan, aşamalı olarak son sürümlere yükseltmek.

**Architecture:** Tek feature branch (`chore/deps-upgrade-next16-tailwind4-ts7`) üzerinde 4 sıralı aşama, aşama başına tek commit. Her aşamadan sonra `npm run build` yeşil + claude-in-chrome ile kritik rotalarda (ışık + dark mode) tam tıklama turu. Bir aşama kırılıp hızlı düzelmezse o commit tek başına `git revert`/`git reset` ile geri alınır; öncekiler durur.

**Tech Stack:** Next.js (App Router) 16.3, React 19.2, TypeScript 7, Tailwind CSS 4 (CSS-first), shadcn/ui + Radix, Supabase SSR, Netlify (OpenNext adapter v5), lucide-react, react-markdown.

## Global Constraints

- **Node:** çalışma + deploy hedefi **Node 22** (Netlify `nodejs22.x`). Değiştirme.
- **Hedef sürümler:** `next@16.3.0`, `tailwindcss@4` + `@tailwindcss/postcss`, `tailwind-merge@3`, `typescript@7.0.2`, `lucide-react@1.29`, `react-markdown@10`.
- **`@types/node` = 22'de KALIR** (Node 22 runtime major eşleşmesi; 26'ya çıkarma).
- **React / react-dom = 19.2.8'de KALIR** (Next 16 minimumunu zaten karşılıyor; dokunma).
- **`middleware.ts` KORUNUR** (proxy.ts'e rename YOK — deprecate ama çalışıyor, Netlify edge ile riskli).
- **Netlify adapter PINLENMEZ** (kaynakta `netlify.toml` yok; otomatik güncelleme kalsın).
- **Renk değerleri BİREBİR KORUNUR** — HSL→OKLCH çevirisi YOK (el-ayarlı mobil-parite renkleri; kayma = regresyon). CSS-first mimariye geçilir ama değerler `hsl(var(--x))` olarak korunur.
- **Kapsam dışı (dokunma):** React Compiler, `@types/node` 26, `middleware`→`proxy`.
- **Doğrulama:** test runner yok. "Geçti" = `npm run build` sıfır hata + tarayıcı turu temiz.
- **Kritik rotalar (her turda):** `/auth/login`, home shell (auth'lu, test user `user@patify.net`/`123456`), public LF ilan `/lost-found/item/[id]` + OG görsel, **ışık ve dark mode**.

---

### Task 0: Preflight — baseline yeşil mi?

Amaç: başlangıç durumunun zaten build-yeşil olduğunu kanıtla ki, sonraki aşamalarda kırılan şeyin bizim değişikliğimiz olduğunu bilelim.

**Files:** yok (sadece doğrulama).

- [ ] **Step 1: Branch'te olduğunu doğrula**

Run: `git branch --show-current`
Expected: `chore/deps-upgrade-next16-tailwind4-ts7`

- [ ] **Step 2: Temiz kurulum**

Run: `npm ci`
Expected: hatasız tamamlanır.

- [ ] **Step 3: Baseline build**

Run: `npm run build`
Expected: PASS (sıfır hata). Çıktıyı not al — bu bizim referans yeşilimiz.

- [ ] **Step 4: Baseline tarayıcı turu (claude-in-chrome)**

`npm run dev` başlat. Kritik rotaları aç, ışık + dark mode kontrol et. Ekran görüntüsü al (sonraki turlarla görsel kıyas için referans):
- `/auth/login`
- Login ol (`user@patify.net` / `123456`) → home shell
- Public LF ilan: geçerli bir listing id ile `/lost-found/item/<id>` (id yoksa uygulamadan/DB'den bir tane al; hiç yoksa route'un not-found'u hatasız render ettiğini doğrula) + OG görsel (`/lost-found/item/<id>/opengraph-image`)

Not: Bu task commit üretmez — sadece referans.

---

### Task 1: Next.js 15.5 → 16.3

**Files:**
- Modify: `package.json` (next sürümü)
- Modify: `next.config.ts` (opsiyonel: `optimizePackageImports` konumu)
- Verify: `components/hero.tsx` (next/image — değişiklik beklenmiyor)
- Verify: `middleware.ts` (korunuyor — değişiklik yok)

**Interfaces:**
- Produces: `next@16.3.x` yüklü, Turbopack default build ile geçen proje. Sonraki tasklar bu tabana kurulur.

- [ ] **Step 1: Codemod ile upgrade**

Run: `npx @next/codemod@latest upgrade latest`
- Sorarsa: `next`'i **16 latest**'e yükselt; `react`/`react-dom`'u **mevcut sürümde tut** (zaten 19.2.8 yeterli — codemod bunları da bump etmek isterse reddet veya sonrasında `package.json`'ı 19.2.8'e geri sabitle).
- Codemod `next.config`'i ve mekanik geçişleri düzenler.

- [ ] **Step 2: package.json'ı doğrula**

`package.json`'da `next` `16.3.x`, `react`/`react-dom` `19.2.8` olmalı. Değilse elle düzelt:

```jsonc
"next": "16.3.0",
"react": "19.2.8",
"react-dom": "19.2.8",
```

Run: `npm install`
Expected: lockfile güncellenir, hatasız.

- [ ] **Step 3: next.config.ts — optimizePackageImports'u üst seviyeye taşı (opsiyonel ama temiz)**

`experimental.optimizePackageImports` Next 16'da hâlâ kabul edilir; taşımak zorunlu değil. Codemod taşımadıysa şu hâle getir (turbopack config gerekmez — webpack yok):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@radix-ui/react-checkbox', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-slot'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
```

- [ ] **Step 4: Build (Turbopack default)**

Run: `npm run build`
Expected: PASS. Build artık Turbopack ile çalışır (webpack config yok, sorun beklenmiyor). Async request API / params uyarısı çıkmamalı (hepsi zaten await'li).

Kırılırsa: hatayı oku. Muhtemel tek nokta `next/image` (`components/hero.tsx`) — src'ler yerel `/images/...` ve query-string yok, sorun beklenmez; çıkarsa src'yi doğrula.

- [ ] **Step 5: Tarayıcı turu**

`npm run dev` → kritik rotalar (login, home shell, LF ilan + OG), ışık + dark mode. Task 0 referansıyla görsel kıyasla — fark olmamalı.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore(deps): upgrade Next.js 15.5 -> 16.3"
```

---

### Task 2: Küçük major'lar — lucide-react v1 + react-markdown v10

**Files:**
- Modify: `package.json` (lucide-react, react-markdown sürümleri)
- Modify: `components/user/social-links.tsx` (brand ikonlar: Instagram/Facebook/Twitter kaldırıldı)
- Modify: `lib/notifications/copy.ts` (`XCircle`→`CircleX`, `CheckCircle2`→`CircleCheckBig`)
- Modify: `components/emergency/emergency-actions.tsx`, `components/shared/report-dialog.tsx`, `components/feedback/feedback-dialog.tsx` (`CheckCircle2`→`CircleCheckBig`)
- Verify: `app/(public)/(support-pages)/pp/page.tsx`, `.../tos/page.tsx` (react-markdown — className geçmiyor, değişiklik beklenmiyor)

**Interfaces:**
- Produces: `lucide-react@1.29`, `react-markdown@10` yüklü; tüm ikon importları v1'de mevcut isimlerle.

- [ ] **Step 1: Paketleri bump et**

Run: `npm install lucide-react@^1.29 react-markdown@^10`
Expected: yüklenir.

- [ ] **Step 2: lucide codemod (rename'ler)**

Run: `npx @lucide/codemod@latest migrate-from-0.x`
Bu, `CheckCircle2`→`CircleCheckBig`, `XCircle`→`CircleX` gibi yeniden adlamaları otomatik yapar. Diff'i incele.

- [ ] **Step 3: Brand ikonları elle düzelt — `components/user/social-links.tsx`**

Bu dosya `Instagram, Facebook, Twitter` import ediyor; üçü de lucide v1'de KALDIRILDI. `Music2` ve `Send` kalır. Kaldırılan üçünü generic lucide ikonlarıyla değiştir (marka SVG bağımlılığı eklemeden, en lazy çözüm):

Import satırını (`:1`) şuna çevir:

```tsx
import { Link2, Music2, Send } from 'lucide-react';
```

Sonra dosyadaki `<Instagram .../>`, `<Facebook .../>`, `<Twitter .../>` kullanımlarını (`:15,17,18,20` civarı) `<Link2 .../>` ile değiştir — sosyal link satırları için nötr bir "bağlantı" ikonu. (İstenirse ileride Simple Icons SVG ile marka ikonu eklenebilir; şimdilik kapsam dışı.)

- [ ] **Step 4: react-markdown — doğrula, değişiklik yok**

`pp/page.tsx` ve `tos/page.tsx` `<ReactMarkdown remarkPlugins={[remarkGfm]}>` kullanıyor, `className` GEÇMİYOR. v10'un tek kırıcı değişikliği `className` kaldırılması → bu proje etkilenmiyor. Kod değişikliği yok.

- [ ] **Step 5: Build — kalan rename'leri yakala**

Run: `npm run build`
Expected: PASS. Kırılırsa hata `Module '"lucide-react"' has no exported member 'X'` şeklindedir → o ikonu v1 adıyla değiştir (rename tablosu: `XCircle`→`CircleX`, `CheckCircle2`→`CircleCheckBig`, `CheckCircle`→`CircleCheck`, `AlertCircle`→`CircleAlert`, `ExternalLink`→`SquareArrowOutUpRight`).

- [ ] **Step 6: Tarayıcı turu**

Kritik rotalar + ikon içeren yerler: profil (settings/about), emergency/report/feedback dialogları (CheckCircle ikonu), sosyal linkler (social-links). İkonlar boş/kayıp görünmemeli. Ayrıca support sayfaları (`/pp`, `/tos`) markdown render'ı bozulmamalı. Işık + dark mode.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(deps): upgrade lucide-react v1 + react-markdown v10; fix removed brand icons & renames"
```

---

### Task 3: Tailwind CSS 3 → 4 (CSS-first) — en yüksek görsel risk

**Files:**
- Modify: `package.json` (tailwindcss, @tailwindcss/postcss, tailwind-merge, tw-animate-css, autoprefixer kaldır)
- Modify: `postcss.config.js`
- Modify: `app/globals.css` (import + @theme inline + @custom-variant + accordion keyframes)
- Delete: `tailwind.config.ts`
- Modify: `components/hero.tsx` (`bg-gradient-to-b` → `bg-linear-to-b`)

**Interfaces:**
- Produces: Tailwind v4 CSS-first kurulumu; tüm tasarım tokenları (`--color-*`, `--radius-*`, `--font-sans`, `--animate-accordion-*`) `@theme inline` altında; renk değerleri birebir korunmuş.

> **NOT — renk stratejisi:** Değerler `hsl(var(--x))` olarak korunur, OKLCH'e çevrilmez (bkz. Global Constraints). Bu, CSS-first mimarisini verir ama renk kaymasını sıfırlar.

- [ ] **Step 1: Otomatik upgrade aracı (mekanik bulk)**

Run: `npx @tailwindcss/upgrade`
Bu araç: `tailwind.config.ts`'i CSS'e çevirmeye çalışır, `@tailwind` direktiflerini `@import "tailwindcss"` yapar, deprecated utility'leri yeniden adlandırır, `package.json`'ı günceller. **Diff'i dikkatle incele** — araç shadcn'e özel işleri (@theme inline köprüsü, animate paketi, dark variant) kaçırır ve JS string'lerinde yanlış rename yapabilir (`blur`→`blur-sm` gibi). Aracın ürettiği CSS'i sonraki adımlarda elle düzenleyeceğiz.

- [ ] **Step 2: package.json bağımlılıklarını sabitle**

Şunları garanti et:

```bash
npm install tailwindcss@^4 @tailwindcss/postcss@^4 tailwind-merge@^3 tw-animate-css@latest
npm uninstall autoprefixer tailwindcss-animate
```
`@tailwindcss/typography` kalır (v4 uyumlu sürüm). `postcss` kalır.

- [ ] **Step 3: postcss.config.js**

İçeriği tam olarak şu olmalı (autoprefixer yok — v4 kendi prefix'liyor):

```js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 4: app/globals.css — CSS-first yaz**

Aracın ürettiğini şu kesin yapıyla değiştir. Renkler raw-channel HSL olarak :root/.dark'ta korunur; `@theme inline` bunları `hsl(var(--x))` ile Tailwind'e tanıtır. Accordion animasyonu ve borderRadius/fontFamily tokenları da @theme'e taşınır.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@import "tw-animate-css";

/* v4 class-tabanlı dark mode (next-themes .dark class'ı toggle ediyor) */
@custom-variant dark (&:is(.dark *));

:root {
  /* Sıcak Toprak (light) — mobile AppPalette parity */
  --background: 33.3 47.4% 96.3%;
  --foreground: 21.8 14.7% 14.7%;
  --card: 0 0% 100%;
  --card-foreground: 21.8 14.7% 14.7%;
  --popover: 0 0% 100%;
  --popover-foreground: 21.8 14.7% 14.7%;
  --primary: 14.3 63.1% 45.7%;
  --primary-foreground: 0 0% 100%;
  --secondary: 23.1 52% 90.2%;
  --secondary-foreground: 19.1 51.6% 35.7%;
  --muted: 34.3 33.3% 91.8%;
  --muted-foreground: 28.6 8.6% 48%;
  --accent: 23.1 52% 90.2%;
  --accent-foreground: 21.8 14.7% 14.7%;
  --destructive: 0 72.2% 50.6%;
  --destructive-foreground: 0 0% 100%;
  --border: 28.4 31.1% 88%;
  --input: 28.4 31.1% 88%;
  --ring: 14.3 63.1% 45.7%;
  --radius: 0.5rem;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --success: 142.1 70.6% 45.3%;
  --warning: 37.7 92.1% 50.2%;
  --gender-female: 339.8 81.9% 58.8%;
  --gender-male: 206.8 89.9% 61%;
  --adopt-success: 113.9 29.7% 32.4%;
}

.dark {
  /* Sıcak Antrasit (dark) — mobile AppPalette parity */
  --background: 37.5 21.1% 7.5%;
  --foreground: 36.7 40.9% 91.4%;
  --card: 36 17.2% 11.4%;
  --card-foreground: 36.7 40.9% 91.4%;
  --popover: 36 17.2% 11.4%;
  --popover-foreground: 36.7 40.9% 91.4%;
  --primary: 20.5 71.4% 57.5%;
  --primary-foreground: 35.3 34.7% 9.6%;
  --secondary: 30 15.8% 14.9%;
  --secondary-foreground: 35 40% 88.2%;
  --muted: 32.7 18% 12%;
  --muted-foreground: 35.6 13.3% 60.2%;
  --accent: 34.3 17.9% 15.3%;
  --accent-foreground: 36.7 40.9% 91.4%;
  --destructive: 8.4 84.3% 65.1%;
  --destructive-foreground: 35.3 34.7% 9.6%;
  --border: 35.3 20% 16.7%;
  --input: 35.3 20% 16.7%;
  --ring: 20.5 71.4% 57.5%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
  --success: 141.9 69.2% 58%;
  --warning: 43.3 96.4% 56.3%;
  --gender-female: 339.8 81.9% 58.8%;
  --gender-male: 206.8 89.9% 61%;
  --adopt-success: 105 25.4% 49.4%;
}

@theme inline {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-success: hsl(var(--success));
  --color-warning: hsl(var(--warning));
  --color-gender-female: hsl(var(--gender-female));
  --color-gender-male: hsl(var(--gender-male));
  --color-adopt-success: hsl(var(--adopt-success));
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));

  /* borderRadius scale override (v3 config'ten) */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* fontFamily */
  --font-sans: Nunito, sans-serif;

  /* accordion animasyonları (v3 config keyframes/animation) */
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

> Container config (`center/padding/screens 2xl:1400px`) v3'te `theme.container` idi. Kod tabanında `container` utility'si kullanılıyorsa v4'te `@utility container { ... }` ile yeniden tanımla; kullanılmıyorsa atla. (Build/tur bunu gösterir.)

- [ ] **Step 5: tailwind.config.ts'i sil**

Run: `git rm tailwind.config.ts`
(v4 content'i auto-detect eder; tüm tokenlar artık globals.css'te.)

- [ ] **Step 6: hero.tsx — yeniden adlanan utility**

`components/hero.tsx:25`'te `bg-gradient-to-b` → `bg-linear-to-b`. (Araç yakalamadıysa elle.) Kod tabanında başka `bg-gradient-to-*`, `ring` (→`ring-3`), `outline-none` (→`outline-hidden`), `shadow-sm` (→`shadow-xs`) varsa aynı şekilde güncelle:

Run: `grep -rnE "bg-gradient-to-|outline-none|\bring\b" --include="*.tsx" app components` ile tara, gerekenleri düzelt.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: PASS. Kırılırsa: eksik `--color-*` token'ı (bir utility class çözülmüyor), `@apply` içinde tanınmayan class, ya da postcss config sorunu. Hatayı oku, ilgili token'ı @theme inline'a ekle.

- [ ] **Step 8: Tarayıcı turu — EN KRİTİK, dark mode dahil her rota**

`npm run dev`. Task 0 referans ekran görüntüleriyle **birebir kıyasla**:
- Renkler (primary/secondary/accent/muted, success/warning, gender rozetleri): kaymamalı.
- Dark mode toggle çalışmalı; `.dark` renkleri uygulanmalı (@custom-variant doğru).
- Animasyonlar: accordion aç/kapa, dialog fade-in, dropdown slide (tw-animate-css) — çalışmalı.
- Rotalar: login, home shell, LF ilan + OG, profil, support (`/pp`, `/tos`).

Herhangi bir renk/dark/animasyon farkı varsa ilgili @theme inline token'ını veya @custom-variant'ı düzelt.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(deps): migrate Tailwind CSS v3 -> v4 (CSS-first, colors preserved)"
```

---

### Task 4: TypeScript 5.7 → 7

**Files:**
- Modify: `package.json` (typescript sürümü; @types/node = 22'de kalır)
- Modify: `tsconfig.json` (`moduleResolution`)

**Interfaces:**
- Produces: `typescript@7.0.2` ile `next build`'in proje-yerel tsc CLI üzerinden temiz geçmesi.

- [ ] **Step 1: TypeScript 7'yi yükle**

Run: `npm install -D typescript@^7`
`@types/node`'a **dokunma** (22'de kalır).

- [ ] **Step 2: tsconfig.json — moduleResolution**

`"moduleResolution": "node"` → `"bundler"`. TS 7 `node`/`node10`'u kaldırdı; bundler-tabanlı (Next) projeler için `bundler` önerilir:

```jsonc
"module": "esnext",
"moduleResolution": "bundler",
```
Diğer alanlar TS 7 uyumlu (target ES2020, paths baseUrl'süz, strict açık) — değişiklik gerekmez.

- [ ] **Step 3: Build (Next 16.3 tsc CLI ile TS 7 typecheck)**

Run: `npm run build`
Expected: PASS. Next 16.3 default olarak proje-yerel `tsc`'yi çağırır (TS 7'nin JS API'si olmadığı için CLI yolu). Tip hataları doğrudan `tsc` diagnostiğiyle basılır.

Kırılırsa muhtemel nedenler:
- **`types` default'u `[]`** → global tipler (`process` vb.) kaybolursa `tsconfig.json`'a ekle: `"types": ["node"]` (veya eski davranış için `["*"]`).
- Başka bir kaldırılan flag hatası → hatayı oku, ilgili tsconfig alanını güncelle.
- **Entegrasyon çok taze (3 günlük):** `next build` TS 7'yi yanlış algılar/çökerse (bilinen erken bug'lar), **fallback:** `npm install -D typescript@^6` ile TS 6'ya (veya 5.7'ye) dön. Önceki 3 aşama korunur; bu commit atlanır ve durum kullanıcıya bildirilir (fail loud).

- [ ] **Step 4: Tarayıcı turu**

Kritik rotalar, ışık + dark mode. Runtime davranış değişmemeli (TS sadece derleme zamanı).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore(deps): upgrade TypeScript 5.7 -> 7 (moduleResolution: bundler)"
```

---

### Task 5: Final doğrulama

**Files:** yok (doğrulama + rapor).

- [ ] **Step 1: outdated kontrolü**

Run: `npm outdated`
Expected: Yalnızca `@types/node` (22 vs 26 — kasıtlı) kalır. Başka major açık kalmadıysa hedef tutmuş.

- [ ] **Step 2: Temiz kurulum + build**

Run: `rm -rf node_modules .next && npm ci && npm run build`
Expected: PASS. Bu, lockfile'ın tutarlı olduğunu ve sıfırdan kurulumun geçtiğini kanıtlar.

- [ ] **Step 3: Tam tarayıcı turu (final)**

Tüm kritik rotalar, ışık + dark mode, Task 0 referansıyla kıyas. Regresyon yok.

- [ ] **Step 4: Özet raporu (fail loud)**

Kullanıcıya raporla: her aşama commit'i, hangi sürümlere çıkıldı, TS 7 fallback'e düşüldü mü, kasıtlı kapsam dışı kalanlar. Atlanan/çözülemeyen bir şey varsa açıkça belirt.

---

## Self-Review (yazım sonrası)

**Spec coverage:** Spec'in 4 aşaması → Task 1-4; prensipler/kritik rotalar → Global Constraints + her task'ın tarayıcı adımı; başarı kriterleri → Task 5. Netlify pin/hero.tsx/middleware kararları → Global Constraints + Task 1. ✓ Boşluk yok.

**Placeholder scan:** Kod adımlarında gerçek içerik var (postcss.config.js, globals.css tam, tsconfig diff, import satırları). "TBD/uygun şekilde" yok. ✓

**Type/isim tutarlılığı:** Branch adı, sürüm hedefleri, ikon rename tablosu, token adları task'lar arası tutarlı. lucide rename'leri (`CheckCircle2`→`CircleCheckBig`, `XCircle`→`CircleX`) Task 2'de tutarlı. ✓
