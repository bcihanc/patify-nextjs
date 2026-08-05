# Web Guest Access + Mobile-Like Home — Design Spec

**Date:** 2026-08-05
**Status:** Approved (design), pending plan
**Branch:** `feat/web-guest-access`

## Goal

Make the web app behave like the mobile app on entry: opening `/` shows the
Lost & Found feed inside the nav shell, and a guest (logged-out visitor) can
browse Lost & Found, Adoptions, and Emergency without logging in. Login is
required only for Inbox (Chats), Profile, notifications, and every write
action (create/edit listing, message a user, report, claim emergency, mark
resolved, etc.).

This mirrors mobile `home_page.dart`: a 5-tab shell (Lost&Found · Adoptions ·
Emergency · Inbox · Profile) where `tabRequiresLogin(index) => index == 3 ||
index == 4` — tabs 0/1/2 are guest-open, 3/4 gate.

## Current state (what exists)

- All app routes live under `app/(app)/*`. `app/(app)/layout.tsx` hard-gates
  the whole group: `getCurrentUserProfile()` → `redirect('/auth/login')` if no
  profile. It also runs the consent gate and renders `AppShell`.
- `AppShell` (`components/app-shell/app-nav.tsx`) requires `userId` +
  `initialNotifications` (mounts `NotificationsProvider` realtime) — not
  guest-compatible as written.
- `lib/supabase/middleware.ts` has a coarse guard: unauthenticated requests to
  `AUTHED_PREFIXES = ['/lost-found','/adoptions','/chats','/profile',
  '/complete-profile','/accept-consent']` bounce to `/auth/login`
  (`/lost-found/item/*` excepted). `/home` → `/lost-found`.
- Browse pages are mostly guest-safe already (e.g. LF browse uses
  `me?.id ?? null`). **Detail pages hard-gate**: LF/Adoptions/Emergency
  `[id]/page.tsx` do `const me = ...; if (!me) redirect('/auth/login')` and
  then use `me.id` for owner check, DM button, report menu.
- `/` (`app/(public)/page.tsx`) renders a marketing `<Hero />` (App Store /
  Play badges) — leftover boilerplate, not the app.
- A public detail page already exists at `app/(public)/lost-found/item/[id]`
  (crawlable share target) — stays as-is.

## Architecture

### 1. Guest-capable app shell

`app/(app)/layout.tsx` no longer redirects guests. Flow:

- `profile = await getCurrentUserProfile()` (may be `null`).
- **Logged-in** (`profile` truthy): unchanged behavior — consent gate via
  `resolveGateRedirect`, gate pages render bare, otherwise render the
  logged-in `AppShell` (notification bell + profile avatar).
- **Guest** (`profile` null): skip consent gate; render a **guest shell** —
  same nav (Kayıp/Sahiplen/Acil + Inbox/Profil), but:
  - No `NotificationsProvider` / `NotificationBell` (realtime needs a userId).
  - Profil nav entry → "Giriş yap" linking to `/auth/login?next=/profile`.
  - Inbox (Sohbet) nav entry → `/auth/login?next=/chats`.

The shell split is driven by whether `userId` is present. `AppShell` gains an
optional/guest mode (see Components).

### 2. `requireAuth()` server helper

New `lib/auth/require-auth.ts`:

```ts
// Returns the logged-in profile (same type getCurrentUserProfile() resolves
// to, non-null), or redirects to login carrying a return path.
export async function requireAuth(next?: string): Promise<Profile>
```

- Calls `getCurrentUserProfile()`. If null → `redirect('/auth/login?next=' +
  encodeURIComponent(next ?? current-pathname))`.
- `next` defaults to the page's own path (read from `x-pathname` header when
  not passed explicitly).
- Non-null return so callers use the profile directly (replaces the old
  layout-provided guarantee).

`next` return handling: `/auth/login` reads `?next=` and, on successful login,
redirects there instead of the default. The value must be validated as a
**local path** (starts with `/`, no `//` or scheme) to prevent open-redirect.

### 3. Where the gate is applied

Login-required subtrees get a `layout.tsx` that calls `requireAuth()`:

- `app/(app)/chats/layout.tsx`
- `app/(app)/notifications/layout.tsx`
- `app/(app)/profile/(self)/layout.tsx` — the profile's own pages (root,
  edit, settings, blocked, change-password, delete, followers, followings,
  about) move into a `(self)` route group so the gate covers them. The route
  group is URL-invisible, so paths stay `/profile`, `/profile/edit`, etc.
  `app/(app)/profile/user/[id]` stays OUTSIDE `(self)` → guest-viewable public
  profile, path unchanged (`/profile/user/[id]`).

Login-required leaf pages call `requireAuth()` at the top (they sit under
guest-open browse trees, so no group boundary covers them):

- `app/(app)/lost-found/create`, `app/(app)/lost-found/[id]/edit`,
  `app/(app)/lost-found/mine`
- `app/(app)/adoptions/create`, `app/(app)/adoptions/[id]/edit`,
  `app/(app)/adoptions/mine`
- `app/(app)/emergency/create`

Guest-open pages (no `requireAuth`, must handle null user):

- `lost-found` (browse), `lost-found/[id]` (detail), `lost-found/map`
- `adoptions` (browse), `adoptions/[id]`, `adoptions/map`
- `emergency` (browse), `emergency/[id]`, `emergency/map`
- `profile/user/[id]` (public profile) — stays OUTSIDE the `profile/(self)`
  gated group (see §3), so it is guest-viewable at the unchanged
  `/profile/user/[id]` path. Its own interactive bits (follow, DM, report)
  login-wall for guests like the listing pages.

### 4. Null-user handling on guest-open pages

Remove `if (!me) redirect(...)` from the three detail pages. Then, for a null
user:

- **Owner check** → `isOwner = false` (no owner-only UI: cip no, OwnerActions,
  edit).
- **`MessageUserButton`** → when `currentUserId` is null, render a login-wall
  variant: a button that links to `/auth/login?next=<current path>` instead of
  starting a chat. (Mobile shows a login modal; web uses the redirect.)
- **`EntityActionMenu`** (Share / Report) → Share stays (public); Report
  requires login → login-wall on click when `currentUserId` is null.
- **Create / "İlan ver" buttons on browse pages** → for guests, link to
  `/auth/login?next=/lost-found/create` (etc.) instead of the create page.
  (The create page itself also `requireAuth`s as defense in depth.)
- **Emergency claim / resolve actions** → hidden or login-wall for guests.
- **Adoptions owner actions / apply** → same pattern.

Data reads use the existing masked RPCs, which already grant anon access
(mobile guests hit the same RPCs) — **no migration, no schema change**. If any
guest read returns a permission error (`42501`) or `22P02`, that is a STOP
signal (fail-loud), not something to work around client-side.

### 5. Root `/` → feed

`app/(public)/page.tsx` → `redirect('/lost-found')` (mobile default tab). The
existing marketing `<Hero />` moves to a new `app/(public)/indir/page.tsx`
(`/indir`) so the App Store / Play links keep a home. Middleware `/home`
→ `/lost-found` behavior stays.

### 6. Middleware coarse guard

`AUTHED_PREFIXES` shrinks to the always-login top-level trees:
`['/chats','/profile','/notifications','/complete-profile','/accept-consent']`.
Remove `/lost-found` and `/adoptions` (now guest-open). Keep the
`/lost-found/item` public exception (harmless). `profile/user/[id]` must not be
coarse-guarded — the `isAuthedPath` check needs a public exception for it, same
shape as the `/lost-found/item` exception. Create/edit/mine are NOT coarse
guarded here; their per-page `requireAuth` is the authority.

## Components

- `AppShell` (`components/app-shell/app-nav.tsx`): accept a guest mode. When
  `userId` is null/absent → don't mount `NotificationsProvider`/bell; render
  Profil and Sohbet nav entries as login links. Cleanest: `userId?: string |
  null`; branch internally. Keep the logged-in path byte-identical.
- `MessageUserButton` (`components/chats/message-user-button.tsx`): when
  `currentUserId` is null, render as a login-wall link. Already self-hides when
  target === current; extend to guest.
- `EntityActionMenu` (`components/shared/entity-action-menu.tsx`): Report entry
  login-walls when `currentUserId` is null; Share always available.
- A small shared helper/pattern for "login-wall link" so the redirect target
  (`/auth/login?next=...`) is built consistently.
- `nav-items.ts`: mark which entries require login (Inbox, Profil) so the shell
  can render them as login links in guest mode without hardcoding.

## Global Constraints

- Never commit to `main`; never push/deploy. Work on `feat/web-guest-access`.
- No DB migration / schema / RPC / publication change. All reads via existing
  masked SECURITY DEFINER RPCs; anon access already granted (mobile parity).
- Writes stay session-authoritative (`user_id`/`authorId` from `getUser()`),
  ownership-scoped, explicit columns, `.select('id')` zero-row bail. No
  `.select('*')` on location-bearing tables.
- `database.types.ts` is deliberately stale — do not modify it.
- Strict TS (`noUncheckedIndexedAccess`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`). `npm run build` is authoritative;
  no test runner. Do NOT run `npm run build` while a dev server holds `.next`.
- `next` return path must be validated local-only (open-redirect guard).
- Copy is Turkish. Match existing component/style conventions.
- Logged-in behavior must be preserved byte-for-byte where possible — this is
  additive (guest path) + gate relocation, not a rewrite of the logged-in app.

## Success criteria

1. Logged-out: `/` → Lost & Found feed with nav shell (no redirect to login).
2. Logged-out: can browse LF/Adoptions/Emergency lists, detail, and map.
3. Logged-out: Inbox/Profil nav → login (with `?next=`); after login, returns
   to the intended tab.
4. Logged-out: every write CTA (İlan ver, mesaj, şikayet, üstlen, çözüldü,
   edit, apply) → login-wall, never a crash or a silent no-op.
5. Logged-out: no NotificationBell, no realtime subscription attempted.
6. Logged-in: unchanged — feed, nav, notifications, all actions work as before;
   consent gate still fires.
7. `npm run build` clean (all routes); `tsc --noEmit` clean.
8. No `.select('*')` added; no `database.types.ts` change; no migration.

## Non-goals / deferred

- Login modal (mobile-style popup). Web uses redirect-with-`next`; a modal can
  come later.
- Un-gating any write path for guests.
- SEO/metadata tuning for the now-app-at-root `/`.
- Unifying the two LF detail pages (`/lost-found/[id]` vs
  `/lost-found/item/[id]`) — both coexist.
