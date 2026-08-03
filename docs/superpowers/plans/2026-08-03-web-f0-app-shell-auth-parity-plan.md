# F0 — Kimlikli App Shell + Auth/Onboarding Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the public-only `patify-nextjs` app into the authenticated foundation (route-group shell + responsive nav + guard/gate chain + full auth/account layer + mobile-matching brand) that the remaining 8 feature domains will sit on.

**Architecture:** Split routing into an `app/(public)/` group (no shell, crawlable — current surface) and an `app/(app)/` group (server-authoritative gate chain in its layout + responsive nav shell). Auth stays Supabase `@supabase/ssr` server actions; pure decision logic (consent staleness, gate redirect) lives in testable `lib/` functions. Shared backend (`uynwrqccvfcwunrzoxva`) is reused as-is — this plan writes web UI + client logic only, no backend/schema changes.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, Tailwind 3 + shadcn/ui, `@supabase/ssr`, `next-themes`, `next/font/google` (Nunito).

**Spec:** `docs/superpowers/specs/2026-08-03-web-f0-app-shell-auth-parity-design.md` (authoritative — every task derives from it; do not add scope beyond it).

## Global Constraints

- **No backend changes.** All Supabase tables/RPCs/edge-functions/buckets already exist (shared with mobile). Never write a migration or DDL. If a task appears to need one → STOP (escalate).
- **`database.types.ts` is stale** — it lacks `user_private` and current `user_profiles` columns. Task 1 fixes this from the mobile migrations (read-only); everything else depends on it.
- **Strict TS beyond `strict`:** `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`. `next build` fails on any unused import/var and on unchecked index access — keep the `rows[0]!` + `// eslint-disable` pattern; drop dead imports.
- **`metadataBase` must never fall back to localhost in production** — do not touch the normalization block in `app/layout.tsx` (lines 17–25) except as Task 4 specifies.
- **i18n: TR-only.** No i18n framework. UI copy Turkish. `<html lang="tr">`.
- **Consent versions (verbatim, single source `lib/consent.ts`):** `TOS_VERSION = '2026-05-23'`, `PP_VERSION = '2026-07-19'`. Keep in sync with mobile `lib/utils/consent_versions.dart`.
- **Theme tokens (verbatim from spec §3.3)** — light `primary #BE4E2B`, dark `primary #E07A45`; full palette in Task 4.
- **Storage:** avatars → `assets` bucket, flat `<uuid>.<ext>`, public URL. Same convention as mobile.
- **Post-login / post-completion target:** `/lost-found` (mobile parity; it is a placeholder in F0).
- **Git:** work on branch `feat/web-f0-app-shell-auth`. Conventional commit per task. **Never commit to main. Never push.**

## Verification model (no test runner)

`package.json` configures **no test runner**; adding one is out of F0 scope (spec §8). So the classic TDD loop is replaced per task by:

1. **`npm run build`** — the type+lint+build gate (runs `tsc` strict + ESLint via `next build`). MUST finish with no errors. This is the primary gate for every task.
2. **Browser smoke** (only where a task has runtime surface) — `npm run dev`, then verify the named behavior with the Chrome MCP tools and record a per-item observation (screenshot path or explicit result). Full auth E2E (real email/Google/Apple + email verification) needs real credentials/providers → cannot be fully automated; record "could not verify, because …" and move on (not a blocker for F0).

Pure decision logic (`needsConsentReprompt`, `resolveGateRedirect`) is written as **standalone pure functions** so it is unit-testable the day a runner lands; until then it is exercised via build + browser smoke. Where a step below says "Verify," it means run the checks named in that step.

---

## File Structure

**Data / logic (create):**
- `lib/consent.ts` — consent version constants + `needsConsentReprompt(profile)` (pure).
- `lib/auth/gate.ts` — `resolveGateRedirect(profile, pathname)` (pure; mirrors mobile `resolveGateRedirect`).
- `lib/profile/types.ts` — `CurrentUserProfile` (merged `user_profiles` + `user_private` shape).
- `lib/profile/server.ts` — `getCurrentUserProfile()` (server; owner-only merge).
- `lib/geo/turkey.ts` — `TURKEY_CITIES`, `TURKEY_DISTRICTS`, `matchTurkeyCity/District` (ported from mobile lists).

**Auth (modify existing location `app/actions.ts` — established pattern, do NOT relocate existing actions):**
- `app/actions.ts` — add `googleSignInAction`; extend `signUpAction` (birth date + consent + optional analytics).

**Theme (modify):**
- `app/globals.css` — light/dark CSS vars (shadcn token names).
- `tailwind.config.ts` — radius/spacing scale, font family.
- `app/layout.tsx` — Nunito font, `lang="tr"`, slim to root-only (nav removed → moves to `(public)` layout).

**Routing (create/move):**
- `app/(public)/layout.tsx` — the current public nav wrapper (moved out of root layout).
- Move into `app/(public)/`: `page.tsx` (landing), `(support-pages)/`, `auth/`, `(auth-pages)/`, `reset-password/`, `home/` (reset-password), `lost-found/item/`. (URLs unchanged — route groups don't affect paths.)
- `app/(app)/layout.tsx` — server gate + shell.
- `app/(app)/lost-found/page.tsx`, `adoptions/page.tsx`, `chats/page.tsx`, `profile/page.tsx` — placeholders.
- `app/(app)/complete-profile/page.tsx`, `app/(app)/accept-consent/page.tsx`.
- `app/(app)/profile/settings/page.tsx`, `profile/edit/page.tsx`, `profile/change-password/page.tsx`, `profile/blocked/page.tsx`, `profile/delete/page.tsx`.
- `components/app-shell/` — `app-nav.tsx` (responsive), `nav-items.ts` (shared config).
- `middleware.ts` — coarse authed-prefix redirect; `/home` → `/lost-found`.

**Client helpers (create):**
- `lib/storage/avatar.ts` — client-side compress + upload to `assets`.

---

## Task 1: Backend type sync (`database.types.ts`)

**Files:**
- Modify: `database.types.ts`
- Read (source of truth, read-only): `/Users/cihan/IdeaProjects/patify/supabase/migrations/*` (esp. the KVKK/`user_private` + `username_exists` migrations)

**Interfaces:**
- Produces: `Database['public']['Tables']['user_private']['Row']` with columns `user_id: string`, `phone: string | null`, `consent_accepted_at: string | null`, `tos_version: string | null`, `pp_version: string | null`, `birth_date: string | null`, `home_city: string | null`, `home_district: string | null`; updated `user_profiles` Row incl. `images: string[] | null`; RPC arg/return types for `username_exists(p_username: string) → boolean` and `set_analytics_consent(enabled: boolean) → …`.

- [ ] **Step 1: Derive the true schema.** In the mobile repo, read the migrations that define `user_private`, its columns, and `username_exists` / `set_analytics_consent`:

```bash
grep -rl "user_private\|username_exists\|set_analytics_consent" /Users/cihan/IdeaProjects/patify/supabase/migrations/ | sort
```

Read each hit; record the exact column names/types and RPC signatures. (If a Supabase CLI login exists, `supabase gen types typescript --project-id uynwrqccvfcwunrzoxva` is the alternative — but the migrations are authoritative and need no DB access. Do NOT connect to prod for writes.)

- [ ] **Step 2: Add `user_private` table type** to `database.types.ts` under `public.Tables`, alphabetically near `user_profiles`, with `Row`/`Insert`/`Update` and a `Relationships` FK to `user_profiles.id`. Use the columns from Step 1 (at minimum the eight listed in Interfaces).

- [ ] **Step 3: Update `user_profiles` Row/Insert/Update** to add any columns present in mobile but missing here (e.g. `images: string[] | null`). Do not remove existing columns.

- [ ] **Step 4: Add RPC signatures** under `public.Functions`: `username_exists` (`Args: { p_username: string }`, `Returns: boolean`) and `set_analytics_consent` (match mobile's arg name/type; `Returns` per migration).

- [ ] **Step 5: Verify.** `npm run build` — MUST pass (types compile). Confirm the new types resolve:

```bash
npx tsc --noEmit -p tsconfig.json && echo TYPES_OK
```

- [ ] **Step 6: Commit.**

```bash
git add database.types.ts
git commit -m "feat(web-f0): sync database.types with user_private + consent columns"
```

---

## Task 2: Consent + gate decision logic (pure, `lib/`)

**Files:**
- Create: `lib/consent.ts`, `lib/auth/gate.ts`

**Interfaces:**
- Consumes: `CurrentUserProfile` shape (defined fully in Task 3; for this task use a minimal structural type — see Step 1).
- Produces: `TOS_VERSION`, `PP_VERSION`, `needsConsentReprompt(c: ConsentState): boolean`; `resolveGateRedirect(input): string | null`.

- [ ] **Step 1: `lib/consent.ts`** — constants + pure staleness check. Structural input so this file has no import cycle with profile types:

```ts
export const TOS_VERSION = '2026-05-23';
export const PP_VERSION = '2026-07-19';

export type ConsentState = {
  consentAcceptedAt: string | null;
  tosVersion: string | null;
  ppVersion: string | null;
};

// Mirrors mobile needsConsentReprompt (router.dart:181-189).
export function needsConsentReprompt(c: ConsentState): boolean {
  return (
    c.consentAcceptedAt == null ||
    c.tosVersion !== TOS_VERSION ||
    c.ppVersion !== PP_VERSION
  );
}
```

- [ ] **Step 2: `lib/auth/gate.ts`** — pure redirect resolver mirroring mobile `resolveGateRedirect` (router.dart:152-174). Order: username gate first, then consent gate; `/complete-profile`, `/accept-consent`, `/reset-password`, `/home/reset-password` are exempt so a gated user can still reach them.

```ts
import { needsConsentReprompt, type ConsentState } from '@/lib/consent';

export type GateInput = {
  username: string | null;
  consent: ConsentState;
  pathname: string;
};

const GATE_EXEMPT = ['/complete-profile', '/accept-consent', '/reset-password', '/home/reset-password'];

export function resolveGateRedirect(input: GateInput): string | null {
  const { username, consent, pathname } = input;
  const exempt = GATE_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (exempt) return null;
  if (username == null) return '/complete-profile';
  if (needsConsentReprompt(consent)) return '/accept-consent';
  return null;
}
```

- [ ] **Step 3: Verify.** `npm run build` passes. (These are pure fns; if/when a test runner lands they get `needsConsentReprompt` + `resolveGateRedirect` unit tests — deferred per spec §8.)

- [ ] **Step 4: Commit.**

```bash
git add lib/consent.ts lib/auth/gate.ts
git commit -m "feat(web-f0): consent versions + pure gate-redirect resolver"
```

---

## Task 3: Current-user profile data layer (`lib/profile`)

**Files:**
- Create: `lib/profile/types.ts`, `lib/profile/server.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; Task 1 types; `ConsentState` from `@/lib/consent`.
- Produces: `CurrentUserProfile` type; `getCurrentUserProfile(): Promise<CurrentUserProfile | null>` (server). This is the canonical "current user" used by the gate layout, settings, and edit-profile.

- [ ] **Step 1: `lib/profile/types.ts`** — merged shape (public `user_profiles` + owner-only `user_private`):

```ts
import type { Database } from '@/database.types';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type PrivateRow = Database['public']['Tables']['user_private']['Row'];

export type CurrentUserProfile = ProfileRow & {
  // owner-only private fields (null when the row is absent)
  phone: PrivateRow['phone'];
  consentAcceptedAt: PrivateRow['consent_accepted_at'];
  tosVersion: PrivateRow['tos_version'];
  ppVersion: PrivateRow['pp_version'];
  birthDate: PrivateRow['birth_date'];
  homeCity: PrivateRow['home_city'];
  homeDistrict: PrivateRow['home_district'];
};
```

- [ ] **Step 2: `lib/profile/server.ts`** — fetch the auth user, then `user_profiles` + `user_private` (owner-only via RLS), merge. Returns `null` if not authenticated.

```ts
import { createClient } from '@/lib/supabase/server';
import type { CurrentUserProfile } from './types';

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_private').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  // A brand-new SSO user may have no profile row yet → treat as username=null.
  return {
    ...(profile ?? ({ id: user.id, username: null } as never)),
    id: user.id,
    username: profile?.username ?? null,
    phone: priv?.phone ?? null,
    consentAcceptedAt: priv?.consent_accepted_at ?? null,
    tosVersion: priv?.tos_version ?? null,
    ppVersion: priv?.pp_version ?? null,
    birthDate: priv?.birth_date ?? null,
    homeCity: priv?.home_city ?? null,
    homeDistrict: priv?.home_district ?? null,
  } as CurrentUserProfile;
}
```

> Note: `username` is typed non-null in `user_profiles` but is null for a not-yet-completed profile; the gate treats null as "needs complete-profile." Keep the explicit `?? null`.

- [ ] **Step 3: Verify.** `npm run build` passes.

- [ ] **Step 4: Commit.**

```bash
git add lib/profile/
git commit -m "feat(web-f0): current-user profile merge (user_profiles + user_private)"
```

---

## Task 4: Theme tokens + Nunito font + lang

**Files:**
- Modify: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`

**Interfaces:**
- Produces: shadcn CSS token vars matching mobile brand; `nunito` font class applied at root; `<html lang="tr">`.

- [ ] **Step 1: `app/globals.css`** — set the shadcn token vars in `:root` (light) and `.dark` from spec §3.3. Convert each hex to the space-separated HSL/`<h> <s>% <l>%` form shadcn expects (or use the hex directly if the existing file already uses hex — match the existing convention in this file). Include: `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --destructive-foreground --border --input --ring`. Add semantic vars `--success --warning --gender-female --gender-male --adopt-success` (both themes).

Light primary `#BE4E2B`; dark primary `#E07A45`. (Full list: spec §3.3.)

- [ ] **Step 2: `tailwind.config.ts`** — set `borderRadius` (sm 4px / md 8px / lg 12px / xl 16px / full 9999px) and confirm spacing scale (Tailwind default already covers xs4/sm8/md16/lg24/xl32 as 1/2/4/6/8). Register the Nunito font family under `theme.extend.fontFamily.sans` and map the semantic colors to the CSS vars from Step 1 so `bg-success` etc. work.

- [ ] **Step 3: `app/layout.tsx`** — replace Geist with Nunito:

```ts
import { Nunito } from 'next/font/google';
const nunito = Nunito({ display: 'swap', subsets: ['latin'] });
```

Change `<html lang="en" className={geistSans.className} …>` → `<html lang="tr" className={nunito.className} …>`. **Do not touch** the `metadataBase`/`defaultUrl` block or the Apple `<meta>` tags. (The public nav in this file moves to `(public)/layout.tsx` in Task 5 — leave it here for now so nothing breaks.)

- [ ] **Step 4: Verify.** `npm run build` passes. Browser smoke: `npm run dev`, load `/`, confirm terracotta primary + Nunito rendering in light and dark (screenshot each). Record observations.

- [ ] **Step 5: Commit.**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "feat(web-f0): mobile brand tokens + Nunito font, lang=tr"
```

---

## Task 5: Route-group split (public/app) + slim root layout

**Files:**
- Create: `app/(public)/layout.tsx`
- Move (git mv): `app/page.tsx`, `app/(support-pages)/`, `app/auth/`, `app/(auth-pages)/`, `app/reset-password/`, `app/home/`, `app/lost-found/` → under `app/(public)/`
- Modify: `app/layout.tsx` (remove nav → root-only)

**Interfaces:**
- Produces: `app/(public)/` group carrying the entire current surface at unchanged URLs; a minimal root layout (html/body/ThemeProvider/font/metadata) that both groups nest under.

> **Why:** the authed shell (Task 6/7) must NOT inherit the public nav. Route groups don't change URLs, so this is a pure reorg. Verify every public URL still resolves after moving.

- [ ] **Step 1: Create `app/(public)/layout.tsx`** holding the current public nav wrapper (copy the `<nav>…HeaderAuth…</nav>` + centered container currently in `app/layout.tsx` lines 55–72), as a layout that renders `{children}`. It nests inside root layout, so it renders only `<main>…{children}</main>` (no `<html>/<body>`).

- [ ] **Step 2: `git mv` the public routes** into the group (URLs unchanged):

```bash
git mv app/page.tsx app/(public)/page.tsx
git mv "app/(support-pages)" "app/(public)/(support-pages)"
git mv app/auth "app/(public)/auth"
git mv "app/(auth-pages)" "app/(public)/(auth-pages)"
git mv app/reset-password "app/(public)/reset-password"
git mv app/home "app/(public)/home"
git mv app/lost-found "app/(public)/lost-found"
```

- [ ] **Step 3: Slim `app/layout.tsx`** to root-only: keep imports for font + ThemeProvider + metadata + the Apple `<meta>` tags + `metadataBase` block; the `<body>` renders `<ThemeProvider>{children}</ThemeProvider>` with no nav/`<main>` wrapper (those now live in `(public)/layout.tsx`). Remove now-unused imports (`HeaderAuth`, `EnvVarWarning`, `Link`, `hasEnvVars`) to satisfy `noUnusedLocals`.

- [ ] **Step 4: Fix any import paths** broken by the moves (relative imports inside moved files that pointed at `@/…` are unaffected; relative `../` imports may need updating). `npm run build` will surface these.

- [ ] **Step 5: Verify.** `npm run build` passes. Browser smoke: `/`, `/pp`, `/auth/login`, `/lost-found/item/<any-id>` (public listing) all still render, and the public listing has NO app shell. Record observations.

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "refactor(web-f0): move public surface into (public) route group, slim root layout"
```

---

## Task 6: `(app)` group — server gate layout, placeholders, middleware

**Files:**
- Create: `app/(app)/layout.tsx`; placeholders `app/(app)/lost-found/page.tsx`, `adoptions/page.tsx`, `chats/page.tsx`, `profile/page.tsx`
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `getCurrentUserProfile` (Task 3), `resolveGateRedirect` (Task 2).
- Produces: an authoritative server gate around all `(app)` routes; coarse middleware redirect; `/home` → `/lost-found`.

- [ ] **Step 1: `app/(app)/layout.tsx`** (server component) — auth check + gate chain. It must know its own pathname; in App Router read it from `headers()` (Next sets `x-invoke-path`/`x-matched-path`; if unavailable, pass via a `<GateRedirectGuard>` is overkill — use the `headers()` `x-pathname` set by middleware in Step 3).

```tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { resolveGateRedirect } from '@/lib/auth/gate';
import { AppShell } from '@/components/app-shell/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  const pathname = (await headers()).get('x-pathname') ?? '';
  const target = resolveGateRedirect({
    username: profile.username,
    consent: {
      consentAcceptedAt: profile.consentAcceptedAt,
      tosVersion: profile.tosVersion,
      ppVersion: profile.ppVersion,
    },
    pathname,
  });
  if (target && target !== pathname) redirect(target);

  return <AppShell profile={profile}>{children}</AppShell>;
}
```

> `AppShell` is created in Task 7. Until then, temporarily render `<>{children}</>` and wire `AppShell` in Task 7. (Note this temporary shim in the commit message.)

- [ ] **Step 2: Placeholder pages** for `/lost-found`, `/adoptions`, `/chats`, `/profile` — each a simple server component with a "yakında" heading (Turkish), so post-login `/lost-found` resolves. Example `app/(app)/lost-found/page.tsx`:

```tsx
export default function LostFoundPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Kayıp & Bulundu</h1><p className="text-muted-foreground">Bu alan yakında.</p></div>;
}
```

- [ ] **Step 3: `middleware.ts`** — keep `updateSession`; add `x-pathname` header + coarse authed-prefix redirect. Route groups are invisible in URLs, so match real prefixes and exclude the public listing:

```ts
const AUTHED_PREFIXES = ['/lost-found', '/adoptions', '/chats', '/profile', '/complete-profile', '/accept-consent'];
// Public exception: /lost-found/item/* is the crawlable listing (public group), NOT gated.
function isAuthedPath(pathname: string): boolean {
  if (pathname.startsWith('/lost-found/item')) return false;
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
```

In the middleware handler: set `response.headers.set('x-pathname', request.nextUrl.pathname)`; if `isAuthedPath` and there is no session user, redirect to `/auth/login`. Also redirect exact `/home` → `/lost-found` (was the old post-login target). Keep the existing matcher (excludes `_next`, images, favicon). **Authority remains the layout (Step 1)** — middleware is the early coarse pass.

- [ ] **Step 4: Verify.** `npm run build` passes. Browser smoke: logged-out visit to `/lost-found` and `/profile` → redirect to `/auth/login` (screenshot); `/lost-found/item/<id>` still public. Record observations. (Gate-chain-for-logged-in verified after auth tasks.)

- [ ] **Step 5: Commit.**

```bash
git add app/(app)/ middleware.ts
git commit -m "feat(web-f0): (app) group server gate chain + middleware coarse guard"
```

---

## Task 7: Responsive app-shell nav

**Files:**
- Create: `components/app-shell/nav-items.ts`, `components/app-shell/app-nav.tsx`
- Modify: `app/(app)/layout.tsx` (wire `AppShell`)

**Interfaces:**
- Consumes: `CurrentUserProfile`.
- Produces: `AppShell({ profile, children })` — bottom tab bar on mobile (`< md`), top bar + optional side nav on desktop (`>= md`); the primary sections mirror mobile shell branches.

- [ ] **Step 1: `nav-items.ts`** — shared config (single source, so future domains add one entry):

```ts
import type { LucideIcon } from 'lucide-react';
import { PawPrint, Heart, MessageCircle, User } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };
export const NAV_ITEMS: NavItem[] = [
  { href: '/lost-found', label: 'Kayıp', icon: PawPrint },
  { href: '/adoptions', label: 'Sahiplen', icon: Heart },
  { href: '/chats', label: 'Sohbet', icon: MessageCircle },
  { href: '/profile', label: 'Profil', icon: User },
];
```

- [ ] **Step 2: `app-nav.tsx`** (client) — responsive shell. Desktop (`md:`): sticky top bar with brand + horizontal `NAV_ITEMS` + a profile/menu affordance; content in a centered container. Mobile: content + a fixed bottom tab bar rendering `NAV_ITEMS` with active state from `usePathname()`. Use Tailwind responsive classes (`hidden md:flex` / `md:hidden fixed bottom-0`). Active link = `text-primary`. Accept `{ profile, children }`.

- [ ] **Step 3: Wire into `(app)/layout.tsx`** — replace the temporary shim with `<AppShell profile={profile}>{children}</AppShell>`.

- [ ] **Step 4: Verify.** `npm run build` passes. Browser smoke at narrow (375px) and wide (1280px) viewports: bottom tab bar on mobile, top nav on desktop, active state on current route (screenshots each). Record observations.

- [ ] **Step 5: Commit.**

```bash
git add components/app-shell/ app/(app)/layout.tsx
git commit -m "feat(web-f0): responsive app shell nav (mobile tab bar / desktop top nav)"
```

---

## Task 8: Google OAuth action + SSO profile bootstrap

**Files:**
- Modify: `app/actions.ts`, `app/(public)/auth/oauth/route.ts`, `app/(public)/auth/login/page.tsx`

**Interfaces:**
- Consumes: existing `appleSignInAction` pattern (`app/actions.ts:140-159`), `/auth/oauth` handler.
- Produces: `googleSignInAction()`; guaranteed `user_profiles` row (username null) after first SSO login.

- [ ] **Step 1: `googleSignInAction`** in `app/actions.ts`, mirroring `appleSignInAction`:

```ts
export const googleSignInAction = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.PUBLIC_URL}/auth/oauth?next=/lost-found`, scopes: 'email profile' },
  });
  if (error) throw error;
  return data.url;
};
```

- [ ] **Step 2: SSO profile bootstrap** in `app/(public)/auth/oauth/route.ts` — after `exchangeCodeForSession` succeeds, ensure a `user_profiles` row exists for the user; if absent, insert `{ id: user.id }` (username left null) so the gate routes them to `/complete-profile`. Use `upsert(..., { onConflict: 'id', ignoreDuplicates: true })` or a `maybeSingle` check then insert. Then redirect to `next` (gate takes over).

- [ ] **Step 3: Google button** on the login page — a form posting to `googleSignInAction` (mirror how the Apple button is wired), Turkish label "Google ile devam et", placed alongside Apple/email.

- [ ] **Step 4: Verify.** `npm run build` passes. Browser smoke: login page shows Google + Apple + email; clicking Google initiates the provider redirect (screenshot up to the external redirect — full round-trip needs real Google creds → record "could not verify E2E, because external provider"). Record observations.

- [ ] **Step 5: Commit.**

```bash
git add app/actions.ts app/(public)/auth/
git commit -m "feat(web-f0): Google OAuth sign-in + SSO profile bootstrap"
```

---

## Task 9: Signup birth-date + consent gate fields

**Files:**
- Modify: `app/actions.ts` (`signUpAction`), the signup form page under `app/(public)/(auth-pages)/` (or wherever signup renders)

**Interfaces:**
- Produces: signup that enforces an age gate (birth date) and a required ToS/PP consent checkbox before submit; optional analytics-consent checkbox. (DB write of consent happens later at `/accept-consent` — spec §4.1; signup only gates.)

- [ ] **Step 1: Locate the signup form.** `grep -rn "signUpAction" app/` to find the page rendering it. (Signup currently collects only email+password.)

- [ ] **Step 2: Add form fields** — `birthDate` (date input; client-validate age ≥ the app's minimum, mirroring mobile's age gate), a **required** consent checkbox linking `/tos` and `/pp` (Turkish copy), and an **optional** analytics-consent checkbox. Submit disabled until birth date valid + consent checked.

- [ ] **Step 3: `signUpAction`** — read the new fields; reject (via `encodedRedirect("error", …)`) if birth date missing/underage or consent unchecked. Keep the existing `supabase.auth.signUp` call unchanged (consent is NOT written here — no session yet). Do not persist birth date here; it is re-collected at `/accept-consent` where a session exists.

- [ ] **Step 4: Verify.** `npm run build` passes. Browser smoke: signup form shows the fields; submit blocked without consent/valid age (screenshot). Record observations.

- [ ] **Step 5: Commit.**

```bash
git add app/actions.ts app/(public)/(auth-pages)/
git commit -m "feat(web-f0): signup age gate + consent checkbox fields"
```

---

## Task 10: `/complete-profile` (2-step)

**Files:**
- Create: `app/(app)/complete-profile/page.tsx` + step components under `app/(app)/complete-profile/`, `lib/storage/avatar.ts`
- Uses: RPC `username_exists`, `assets` bucket.

**Interfaces:**
- Consumes: `getCurrentUserProfile`, client Supabase (`@/lib/supabase/client`).
- Produces: username uniqueness UX + avatar/bio write; on finish → `/lost-found`.

- [ ] **Step 1: `lib/storage/avatar.ts`** — client compress + upload:

```ts
import { createClient } from '@/lib/supabase/client';

export async function uploadAvatar(file: File): Promise<string> {
  const compressed = await compressImage(file); // canvas re-encode to jpeg ~q0.5, max ~1024px
  const ext = 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from('assets').upload(path, compressed, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path; // store bare path in user_profiles.profile_photo (mobile convention)
}
```

Implement `compressImage` with a canvas (no new dependency); if the reviewer prefers, `browser-image-compression` is the fallback (spec §9 open point — canvas default keeps deps minimal).

- [ ] **Step 2: Step 1 view — username (mandatory).** Client component: text input, 400ms-debounced availability check calling `supabase.rpc('username_exists', { p_username })`; show available/taken/invalid; block navigation back (a full-screen step, no shell escape). Prefill suggestion from any stored SSO name if present. On submit → `supabase.from('user_profiles').update({ username }).eq('id', user.id)`.

- [ ] **Step 3: Step 2 view — avatar + bio (optional).** Avatar via `<input type="file" accept="image/jpeg,image/png,image/webp">` → `uploadAvatar` → `update({ profile_photo: path })`. Bio `<textarea maxLength={160}>` → `update({ bio })`. "Şimdilik geç" writes nothing. On finish → `router.push('/lost-found')`.

- [ ] **Step 4: `page.tsx`** — orchestrates the two steps; if the current profile already has a username, skip Step 1 (mobile parity). Fetch profile server-side, pass down.

- [ ] **Step 5: Verify.** `npm run build` passes. Browser smoke (needs a logged-in test user; if unavailable record "could not verify E2E, because no test session"): username debounce shows taken/available; avatar picker present. Record observations.

- [ ] **Step 6: Commit.**

```bash
git add app/(app)/complete-profile/ lib/storage/avatar.ts
git commit -m "feat(web-f0): /complete-profile 2-step (username_exists + avatar/bio)"
```

---

## Task 11: `/accept-consent`

**Files:**
- Create: `app/(app)/accept-consent/page.tsx` (+ a server action for the write)

**Interfaces:**
- Consumes: `TOS_VERSION`, `PP_VERSION` (`@/lib/consent`), `getCurrentUserProfile`, RPC `set_analytics_consent`.
- Produces: consent write to `user_private`; on accept → `/lost-found`.

- [ ] **Step 1: Consent wall UI** — no back/escape; birth date **mandatory** (prefilled from `profile.birthDate` if present), the ToS/PP acceptance, optional analytics-consent toggle. Exits: **Kabul et** (accept), **Çıkış yap** (logout → `signOutAction`), **Hesabı sil** (→ `/profile/delete`). Turkish copy; link `/tos` and `/pp`.

- [ ] **Step 2: Accept server action** — UPSERT `user_private` for the current user with `{ user_id, consent_accepted_at: new Date().toISOString(), tos_version: TOS_VERSION, pp_version: PP_VERSION, birth_date }`. If analytics toggle on → `supabase.rpc('set_analytics_consent', { … })` (fire-and-forget; match mobile arg name). Then `redirect('/lost-found')` (gate re-evaluates and passes).

- [ ] **Step 3: Verify.** `npm run build` passes. Browser smoke (logged-in test user or record limitation): the wall renders, accept writes and forwards. Additionally confirm the **re-prompt**: with a logged-in user whose `tos_version` differs from `TOS_VERSION`, visiting an `(app)` route routes to `/accept-consent` (this exercises Task 2 + Task 6). Record observations.

- [ ] **Step 4: Commit.**

```bash
git add app/(app)/accept-consent/
git commit -m "feat(web-f0): /accept-consent wall + user_private consent write"
```

---

## Task 12: Settings index + edit-profile (incl. home-location)

**Files:**
- Create: `app/(app)/profile/settings/page.tsx`, `app/(app)/profile/edit/page.tsx`, `lib/geo/turkey.ts`, a profile-update server action.

**Interfaces:**
- Consumes: `getCurrentUserProfile`, `reverse-geocode` edge fn, `navigator.geolocation`.
- Produces: settings hub; edit-profile writing `{phone, home_city, home_district}` → `user_private`, rest → `user_profiles`; theme toggle; analytics-consent toggle.

- [ ] **Step 1: `lib/geo/turkey.ts`** — port `TURKEY_CITIES` / `TURKEY_DISTRICTS` + `matchTurkeyCity` / `matchTurkeyDistrict` from mobile (`kTurkeyCities`/`kTurkeyDistricts`, `utils/geocoder.dart`). Read the mobile lists; copy verbatim.

- [ ] **Step 2: `profile/settings/page.tsx`** — sections mirroring mobile (spec §4.5), showing ONLY the self-contained items: Edit profile, Change password, Blocked users, Analytics consent (toggle → `set_analytics_consent`), Theme toggle (`next-themes`), Export data, Delete account (red). **Stub/omit** bookmarks, my applications, accept-DMs, notifications settings (spec §2 deferrals) — do not render them.

- [ ] **Step 3: `profile/edit/page.tsx`** — form for bio, socials (`x_url`/`instagram_url`/`telegram_url`/`tiktok_url`/`facebook_url`), phone, avatar (reuse `uploadAvatar`), and **home-location**: a "Konumumu bul" button → `navigator.geolocation.getCurrentPosition` → POST to `reverse-geocode` edge fn → `matchTurkeyCity/District`, plus a manual city/district selector fallback. Mirror to `localStorage` (`home_city`/`home_district`).

- [ ] **Step 4: Profile-update server action** — split writes: `{phone, home_city, home_district}` → UPSERT `user_private`; `{bio, *_url, profile_photo}` → UPDATE `user_profiles` (mobile `user_profile_repo` split).

- [ ] **Step 5: Verify.** `npm run build` passes. Browser smoke: settings hub renders only the in-scope items; edit-profile saves; geolocation button resolves a city (or record permission limitation). Record observations.

- [ ] **Step 6: Commit.**

```bash
git add app/(app)/profile/settings/ app/(app)/profile/edit/ lib/geo/
git commit -m "feat(web-f0): settings hub + edit-profile with home-location"
```

---

## Task 13: Change-password + blocked-users

**Files:**
- Create: `app/(app)/profile/change-password/page.tsx`, `app/(app)/profile/blocked/page.tsx` (+ actions)

**Interfaces:**
- Consumes: `user_blockings` table; Supabase auth.
- Produces: password change (reauth + update); blocked-users list + unblock.

- [ ] **Step 1: Change-password** — form: current password, new, confirm. Action: reauth via `signInWithPassword(email, current)` then `updateUser({ password: new })`. Turkish copy + validation (match/length). Errors via `encodedRedirect`.

- [ ] **Step 2: Blocked-users** — server-fetch `user_blockings` joined to `blocked_user_id(*)` for the current user; list each with an **Engeli kaldır** button → server action DELETE from `user_blockings`. (The "block" action itself is deferred to the User domain — do not add it.)

- [ ] **Step 3: Verify.** `npm run build` passes. Browser smoke (logged-in or record limitation): change-password form validates; blocked list renders + unblock removes a row. Record observations.

- [ ] **Step 4: Commit.**

```bash
git add app/(app)/profile/change-password/ app/(app)/profile/blocked/
git commit -m "feat(web-f0): change-password + blocked-users list/unblock"
```

---

## Task 14: Delete-account + export-data

**Files:**
- Create: `app/(app)/profile/delete/page.tsx`
- Modify: `app/actions.ts` (harden `deleteAccountAction`; add `exportDataAction`)

**Interfaces:**
- Consumes: edge fns `delete-authenticated-user`, `export-user-data`.
- Produces: confirm-phrase delete with reauth; data export as a browser download.

- [ ] **Step 1: Delete-account page** — require the user to type a confirmation phrase verbatim to enable the destructive button (mobile parity). On confirm: reauth per provider (`user.app_metadata.provider`: email → password dialog; google/apple → re-initiate OAuth), then invoke `delete-authenticated-user` (existing `deleteAccountAction`), then `signOut` → `/auth/login`. (The existing `deleteAccountAction` already calls the edge fn + signOut; add the confirm-phrase + reauth gate in front.)

- [ ] **Step 2: `exportDataAction`** — invoke `export-user-data` edge fn (POST); return the JSON to the client which triggers a browser download (`Blob` + `<a download>`). Turkish button "Verilerimi indir" in settings.

- [ ] **Step 3: Verify.** `npm run build` passes. Browser smoke: delete page requires exact phrase to enable the button (screenshot); export button triggers a download (or record edge-fn-auth limitation). Record observations.

- [ ] **Step 4: Commit.**

```bash
git add app/(app)/profile/delete/ app/actions.ts
git commit -m "feat(web-f0): delete-account confirm/reauth + data export download"
```

---

## Final verification (after all tasks)

- [ ] `npm run build` clean from a fresh state.
- [ ] Browser smoke against spec §8 success criteria 1–9 (those automatable without external providers); record each observation. Criteria needing real Google/Apple/email-verification → record "could not verify, because …".
- [ ] `git status` clean (only the pre-existing unrelated `.gitignore`/`deno.lock`); branch `feat/web-f0-app-shell-auth`; no push.

---

## Self-review (done during planning)

- **Spec coverage:** §3.1 routing → Tasks 5,6; §3.2 gate → Tasks 2,6; §3.3 theme → Task 4; §3.4 data layer/types → Tasks 1,2,3; §4.1 auth → Tasks 8,9; §4.2 complete-profile → Task 10; §4.3 accept-consent → Task 11; §4.4 home-location → Task 12; §4.5 settings → Tasks 12,13,14. All spec sections mapped.
- **No new scope:** deferrals (bookmarks/applications/accept-DMs/notifications/onboarding-carousel/block-action/web-push) are explicitly omitted per spec §2.
- **Type consistency:** `CurrentUserProfile` (Task 3) is the single profile shape consumed by Tasks 6,10,11,12; `ConsentState`/`resolveGateRedirect` (Task 2) consumed by Task 6; `uploadAvatar` (Task 10) reused by Task 12.
- **Adaptation flagged:** no test runner → build + browser smoke per task; pure logic isolated for future unit tests (spec §8).
