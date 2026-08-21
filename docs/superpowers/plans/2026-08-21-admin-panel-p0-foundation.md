# Admin Panel — P0 (Temel) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yalnız adminlerin erişebildiği, kimlik-kontrollü boş bir `/admin` konsol kabuğu + grafik/tablo altyapısı kurmak (sonraki fazların üzerine bina edeceği temel).

**Architecture:** Web repo'da yeni `app/(admin)/` route group + `requireAdmin()` gate; DB tarafında (mobil repo migration'ı) `admin_users` tablosu + RLS. Service-role client yalnız ileride ban için eklenir (bu fazda kurulur, kullanılmaz). Dashboard okumaları admin-RLS/RPC ile; bu fazda henüz veri yok.

**Tech Stack:** Next.js 16.3.0 (App Router, Turbopack), React 19.2.8, TypeScript 6.0.3 (strict + noUncheckedIndexedAccess), Tailwind v4 + shadcn/ui, Supabase `@supabase/ssr` + `@supabase/supabase-js`, recharts + @tanstack/react-table (bu fazda eklenir).

**Spec:** `docs/superpowers/specs/2026-08-21-admin-bi-panel-design.md`

## Global Constraints

- **Test runner / ESLint YOK.** Doğrulama kanalları: (1) `npm run build` — TS strict tip kontrolü (kullanılmayan import/değişken build'i kırar, dead import bırakma); (2) test hesaplarıyla manuel route kontrolü (bkz. `CLAUDE.local.md`); (3) DB için mobil repo'da SQL assertion. Uydurma `pytest`/`vitest` komutu yazma.
- **DB source-of-truth = mobil repo** `/Users/cihan/IdeaProjects/patify/supabase/migrations/`. Tüm tablo/RLS/RPC değişiklikleri ORADA yazılır; web repo yalnız UI + Server Actions. Supabase project id: `uynwrqccvfcwunrzoxva`.
- **Git:** repo `main`'de → önce feature branch `feat/admin-panel-p0`. Her task sonunda **local commit**; **push YOK** (kullanıcı ayrıca istemedikçe). Mobil repo değişiklikleri kendi branch'inde ayrı commit'lenir.
- **Path alias:** `@/*` → repo kökü. **UI dili Türkçe**, tanımlayıcılar İngilizce.
- **Service-role anahtarı** (`SUPABASE_SERVICE_ROLE_KEY`) asla `NEXT_PUBLIC_*` olamaz, Client Component'a giremez.
- **Route grubu URL'i etkilemez:** `/admin` → dosya yolu `app/(admin)/admin/page.tsx`; gate/chrome `app/(admin)/layout.tsx`.

---

### Task 1: Feature branch + canlı DB baseline & §11 bilinmeyenlerini çöz

**Files:**
- Create: `docs/superpowers/notes/2026-08-21-admin-db-baseline.md`

**Interfaces:**
- Produces: P1'i besleyen doğrulanmış gerçekler (reports.status kullanımı, adopted_at varlığı, ban semantiği, mevcut admin/rol izleri, canlı RLS/RPC dökümü).

- [ ] **Step 1: Branch aç**

Run:
```bash
cd /Users/cihan/WebStormProjects/patify-nextjs && git checkout -b feat/admin-panel-p0
```

- [ ] **Step 2: §11 sorgularını çalıştır (Supabase MCP `execute_sql`, project `uynwrqccvfcwunrzoxva`)**

Çalıştırılacak sorgular (sonuçları not dosyasına yapıştır):
```sql
-- 1) reports.status'u kim yazıyor? mevcut dağılım
select status, count(*) from public.reports group by status;
-- 2) adopted_at var mı? adoptions kolonları
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name='adoptions' order by ordinal_position;
-- 3) mark_reunited viaPatify nereye yazıyor?
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='mark_reunited';
-- 4) auth.users.banned_until deletion-tombstone semantiği: kaç satır infinity?
select count(*) filter (where banned_until is not null) as banned_rows,
       count(*) filter (where banned_until = 'infinity') as infinity_rows from auth.users;
-- 5) admin/rol izi var mı? (olmamalı — teyit)
select table_name, column_name from information_schema.columns
 where table_schema='public' and (column_name ilike '%admin%' or column_name ilike '%role%');
-- 6) mevcut RLS politikaları (admin işine baseline)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
 from pg_policies where schemaname in ('public','chats') order by tablename, policyname;
```

- [ ] **Step 3: Bulguları not dosyasına yaz**

`docs/superpowers/notes/2026-08-21-admin-db-baseline.md` içine her sorgunun cevabını + şu üç kararı yaz: (a) `admin_users` ile çakışan bir yapı yok mu; (b) P1 ban'ı `user_bans` tablosuyla mı yoksa `auth.users.banned_until` finite ile mi olacak (silme-tombstone'undan ayrım netleşsin); (c) `reports.status` mobil tarafından yazılıyorsa web enum'uyla uyumu.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/notes/2026-08-21-admin-db-baseline.md
git commit -m "docs(admin): live DB baseline + resolve P1 schema unknowns"
```

---

### Task 2: `admin_users` tablosu + RLS (mobil repo migration) + RLS testi + founder seed

**Files:**
- Create: `/Users/cihan/IdeaProjects/patify/supabase/migrations/<ts>_admin_users.sql`
- Create: `/Users/cihan/IdeaProjects/patify/supabase/tests/admin_users_rls_test.sql`

**Interfaces:**
- Produces: `public.admin_users(user_id uuid pk, role text, created_at, created_by)`; RLS: authenticated yalnız kendi satırını select; client insert/update/delete kapalı.

- [ ] **Step 1: RLS testini yaz (kırmızı — tablo yok)**

`.../supabase/tests/admin_users_rls_test.sql`:
```sql
-- Non-admin (test2 hesabı) hiçbir admin_users satırı görememeli, insert edememeli.
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"938b32a0-f93d-4de8-8819-067899bdcf43","role":"authenticated"}';

  do $$
  declare n int;
  begin
    select count(*) into n from public.admin_users;
    assert n = 0, 'non-admin must see zero admin_users rows';
  end $$;

  do $$
  begin
    begin
      insert into public.admin_users(user_id) values ('938b32a0-f93d-4de8-8819-067899bdcf43');
      assert false, 'insert must be denied by RLS';
    exception when others then null; -- beklenen: reddedildi
    end;
  end $$;
rollback;
```

- [ ] **Step 2: Testi çalıştır, kırmızı doğrula**

Run (mobil repo linked DB veya Supabase branch):
```bash
cd /Users/cihan/IdeaProjects/patify && supabase db query --file supabase/tests/admin_users_rls_test.sql
```
Expected: HATA — `relation "public.admin_users" does not exist`.

- [ ] **Step 3: Migration'ı yaz**

`.../supabase/migrations/<ts>_admin_users.sql` (ts = `date +%Y%m%d%H%M%S`):
```sql
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.admin_users enable row level security;

-- Authenticated may read ONLY their own membership row (self-check).
create policy admin_users_select_own on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies → denied for anon & authenticated.
-- Membership is managed only via service_role / direct SQL.

comment on table public.admin_users is
  'Admin panel membership. Presence of a row = admin. Managed only via service_role/direct SQL.';
```

- [ ] **Step 4: Migration'ı uygula, testi yeşil doğrula**

Run:
```bash
cd /Users/cihan/IdeaProjects/patify && supabase db push   # veya Supabase branch'e
supabase db query --file supabase/tests/admin_users_rls_test.sql
```
Expected: hata yok, assert'ler geçer.

- [ ] **Step 5: Founder admin'i seed et**

Önce id'yi bul, sonra ekle (MCP `execute_sql` veya `supabase db query`):
```sql
-- cihan'ın gerçek hesabının id'sini bul:
select id, email from auth.users where email ilike '%cihan%' or email = 'user@patify.net';
-- dönen id ile (service_role bağlamında):
insert into public.admin_users(user_id, role) values ('<CIHAN_USER_ID>', 'admin')
  on conflict (user_id) do nothing;
```

- [ ] **Step 6: Commit (mobil repo)**

```bash
cd /Users/cihan/IdeaProjects/patify
git add supabase/migrations/*_admin_users.sql supabase/tests/admin_users_rls_test.sql
git commit -m "feat(admin): admin_users table + own-row RLS + rls test"
```

---

### Task 3: `database.types.ts` yeniden üret (web)

**Files:**
- Modify: `/Users/cihan/WebStormProjects/patify-nextjs/database.types.ts`

**Interfaces:**
- Produces: `admin_users` tipi + bayat kolonlar güncel (ör. `reports.status`).

- [ ] **Step 1: Tipleri üret**

Run (biri):
```bash
npx supabase gen types typescript --project-id uynwrqccvfcwunrzoxva > database.types.ts
```
(Alternatif: Supabase MCP `generate_typescript_types` çıktısını dosyaya yaz.)

- [ ] **Step 2: `admin_users` ve `reports.status` geldi mi doğrula**

Run:
```bash
grep -n "admin_users" database.types.ts && grep -n "status" database.types.ts | head
```
Expected: `admin_users` tipi var; `reports` içinde `status` alanı görünür.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS (tip hatası yok).

- [ ] **Step 4: Commit**

```bash
git add database.types.ts && git commit -m "chore(admin): regenerate db types (admin_users, reports.status)"
```

---

### Task 4: Service-role admin client factory (web)

**Files:**
- Create: `lib/supabase/admin.ts`
- Modify: `.env.local` (yerel; commit edilmez) — `SUPABASE_SERVICE_ROLE_KEY=...`
- Modify: `package.json` (server-only dep)

**Interfaces:**
- Produces: `createAdminClient(): SupabaseClient` — RLS-bypass, server-only. Bu fazda import edilir ama çağrılmaz.

- [ ] **Step 1: `server-only` guard paketini ekle**

Run: `npm install server-only`

- [ ] **Step 2: Factory'yi yaz**

`lib/supabase/admin.ts`:
```ts
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// SERVER-ONLY. Bypasses RLS — use ONLY for operations that genuinely require it
// (e.g. Supabase Auth admin ban). Never import from a Client Component.
// SUPABASE_SERVICE_ROLE_KEY must never be exposed as NEXT_PUBLIC_*.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('createAdminClient: SUPABASE_SERVICE_ROLE_KEY missing (server-only)')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

- [ ] **Step 3: `.env.local`'e service key ekle (yerel, git dışı)**

`.env.local` içine Supabase dashboard → Project Settings → API → `service_role` anahtarını `SUPABASE_SERVICE_ROLE_KEY=` olarak ekle. `.gitignore`'da `.env*` olduğunu doğrula.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS. (Factory henüz çağrılmadığından runtime etkisi yok; sadece tip/derleme.)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/admin.ts package.json package-lock.json
git commit -m "feat(admin): server-only service-role client factory (unused until ban)"
```

---

### Task 5: `requireAdmin()` + `getAdminUserId()` (web)

**Files:**
- Create: `lib/admin/auth.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `getAdminUserId(): Promise<string | null>`; `requireAdmin(): Promise<string>` (anon → `/auth/login`; non-admin → `notFound()`; admin → user id).

- [ ] **Step 1: Helper'ı yaz**

`lib/admin/auth.ts`:
```ts
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Returns the current user's id if they are an admin, else null. No redirect.
export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user.id : null
}

// Layout/page gate: anon → login; non-admin → 404 (don't reveal the panel).
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) notFound()
  return user.id
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS. (`admin_users` tipi Task 3'ten geldi; `.from('admin_users')` tiplenir.)

- [ ] **Step 3: Commit**

```bash
git add lib/admin/auth.ts && git commit -m "feat(admin): requireAdmin/getAdminUserId gate helpers"
```

---

### Task 6: `(admin)` route group + gate'li layout + Overview placeholder (web)

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/admin/page.tsx`
- Create: `components/admin/admin-nav.tsx` (Task 8'de zenginleşecek; burada minimal)

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/admin/auth`.
- Produces: `/admin` route, admin-gated.

- [ ] **Step 1: Minimal nav bileşeni (geçici)**

`components/admin/admin-nav.tsx`:
```tsx
export function AdminNav() {
  return (
    <aside className="w-48 shrink-0 border-r p-3 text-sm">
      <div className="font-semibold opacity-60">PATIFY ADMIN</div>
    </aside>
  )
}
```

- [ ] **Step 2: Gate'li layout**

`app/(admin)/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/admin/auth'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin() // anon → login, non-admin → 404
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Overview placeholder**

`app/(admin)/admin/page.tsx`:
```tsx
export default function AdminOverviewPage() {
  return <h1 className="text-xl font-semibold">Genel Bakış</h1>
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS; route listesinde `/admin` görünür.

- [ ] **Step 5: Manuel doğrulama (test hesapları)**

`npm run dev`, sonra:
- Admin (Task 2'de seed edilen hesap) ile `/admin` → "Genel Bakış" görünür.
- Non-admin (`test2@patify.net`) ile `/admin` → **404**.
- Çıkış yapıp `/admin` → (Task 7'den önce) layout `requireAdmin` login'e yönlendirir.

- [ ] **Step 6: Commit**

```bash
git add app/(admin)/layout.tsx "app/(admin)/admin/page.tsx" components/admin/admin-nav.tsx
git commit -m "feat(admin): gated (admin) route group + overview placeholder"
```

---

### Task 7: Middleware coarse guard — `/admin` prefix (web)

**Files:**
- Modify: `lib/supabase/middleware.ts:7` (`AUTHED_PREFIXES`)

**Interfaces:**
- Produces: giriş yapmamış `/admin*` isteği erkenden `/auth/login`'e döner (authoritative gate yine layout'ta).

- [ ] **Step 1: Prefix ekle**

`lib/supabase/middleware.ts`, `AUTHED_PREFIXES` dizisine `'/admin'` ekle:
```ts
const AUTHED_PREFIXES = ['/chats', '/profile', '/notifications', '/complete-profile', '/accept-consent', '/admin']
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Manuel doğrulama**

Çıkış yapmış tarayıcıda `/admin` → `/auth/login`'e redirect (layout'a hiç ulaşmadan).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(admin): coarse-guard /admin in middleware AUTHED_PREFIXES"
```

---

### Task 8: Admin shell chrome — sol nav (8 bölüm, aktif vurgu) (web)

**Files:**
- Modify: `components/admin/admin-nav.tsx`

**Interfaces:**
- Consumes: `usePathname` (next/navigation).
- Produces: 8 bölümlü sol navigasyon; aktif link vurgulu. Henüz olmayan route'lar 404 verir (P1+ ile dolacak) — bu fazda kabul.

- [ ] **Step 1: Nav'ı zenginleştir (client component)**

`components/admin/admin-nav.tsx`:
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: 'Genel Bakış', icon: '📊' },
  { href: '/admin/moderation', label: 'Moderasyon', icon: '🛡️' },
  { href: '/admin/feedback', label: 'Feedback', icon: '💬' },
  { href: '/admin/metrics', label: 'Metrikler', icon: '📈' },
  { href: '/admin/users', label: 'Kullanıcılar', icon: '👤' },
  { href: '/admin/content', label: 'İçerik', icon: '🐾' },
  { href: '/admin/ops', label: 'Ops / Flag’ler', icon: '⚙️' },
  { href: '/admin/push', label: 'Push', icon: '🔔' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  return (
    <aside className="w-52 shrink-0 border-r p-3 text-sm">
      <div className="mb-3 px-2 font-semibold opacity-60">PATIFY ADMIN</div>
      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((it) => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-md px-2 py-1.5 ${active ? 'bg-primary/15 font-medium' : 'hover:bg-muted'}`}
            >
              <span className="mr-2">{it.icon}</span>{it.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS. (`bg-primary/15`, `bg-muted` token'ları mevcut Tailwind/shadcn temasında var; yoksa `bg-neutral-…`'e düş.)

- [ ] **Step 3: Manuel doğrulama**

`/admin` altında 8 link görünür; aktif olan vurgulu; olmayan route'lar 404 (beklenen).

- [ ] **Step 4: Commit**

```bash
git add components/admin/admin-nav.tsx
git commit -m "feat(admin): 8-section sidebar nav with active highlight"
```

---

### Task 9: Grafik + tablo kütüphaneleri + shadcn primitifleri + recharts smoke test (web)

**Files:**
- Modify: `package.json`
- Create: shadcn primitifleri (`components/ui/table.tsx`, `tabs.tsx`, `select.tsx`, `sheet.tsx`, `sonner.tsx`, `skeleton.tsx`, `alert-dialog.tsx`, `separator.tsx`)
- Modify: `app/(admin)/admin/page.tsx` (recharts smoke test grafiği)

**Interfaces:**
- Produces: recharts + @tanstack/react-table kurulu ve React 19 ile derleniyor; sonraki fazların kullanacağı primitifler hazır.

- [ ] **Step 1: Kütüphaneleri kur (React 19 peer uyumu doğrula)**

Run:
```bash
npm install recharts @tanstack/react-table
```
Peer conflict çıkarsa: recharts v3+ React 19'u destekler; gerekiyorsa `npm install recharts@^3`. v3 de çakışırsa fallback: hafif SVG sparkline'ları el-yapımı çiz (bu durumu not dosyasına yaz, sessiz atlama).

- [ ] **Step 2: shadcn primitiflerini ekle**

Run:
```bash
npx shadcn@latest add table tabs select sheet sonner skeleton alert-dialog separator
```
(shadcn init edilmemişse önce `npx shadcn@latest init` — mevcut `components/ui/*` zaten shadcn stilinde, config'i koru.)

- [ ] **Step 3: recharts smoke test (geçici)**

`app/(admin)/admin/page.tsx`'i geçici olarak güncelle:
```tsx
'use client'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const data = [{ d: 'Pzt', v: 3 }, { d: 'Sal', v: 5 }, { d: 'Çar', v: 4 }, { d: 'Per', v: 7 }]

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Genel Bakış</h1>
      <div className="mt-4 h-40 w-full max-w-md">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="d" /><YAxis />
            <Line type="monotone" dataKey="v" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build + manuel render**

Run: `npm run build`
Expected: PASS (recharts React 19 ile derleniyor). `npm run dev` → `/admin`'de çizgi grafiği render olur.

- [ ] **Step 5: Smoke test grafiğini geri al (page tekrar server component placeholder)**

`app/(admin)/admin/page.tsx`'i Task 6'daki server-component placeholder'a döndür (recharts kanıtlandı, P2'de gerçek Overview gelecek):
```tsx
export default function AdminOverviewPage() {
  return <h1 className="text-xl font-semibold">Genel Bakış</h1>
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/ui "app/(admin)/admin/page.tsx"
git commit -m "chore(admin): add recharts + tanstack-table + shadcn primitives (verified React 19)"
```

---

## Self-Review (yazan tarafından yapıldı)

**Spec coverage (P0 dilimi):** §3.1 route group + layout gate → Task 6; §3.1 middleware prefix → Task 7; §3.2 admin_users + RLS → Task 2; §3.2 requireAdmin per-request → Task 5; §3.2 service-role client → Task 4; §3.4 types regen → Task 3; §7 charting/table/shadcn → Task 9; §11 canlı doğrulama → Task 1. P1+ modülleri kapsam dışı (ayrı planlar).

**Placeholder taraması:** `<CIHAN_USER_ID>` ve migration `<ts>` gerçek-veri look-up adımlarıyla verildi (yasak placeholder değil). Kod adımları gerçek kod içeriyor.

**Tip tutarlılığı:** `requireAdmin`/`getAdminUserId` (Task 5) `.from('admin_users')` kullanır; tip Task 3'te üretilir → sıra doğru. `AdminNav` Task 6'da minimal, Task 8'de tam; ikisi de aynı export adı.

**Bilinen risk:** recharts↔React 19 peer uyumu Task 9 Step 1'de canlı doğrulanır, fallback tanımlı. Tailwind token adları (`bg-primary/15`) Task 8 Step 2'de doğrulanır, fallback tanımlı.
