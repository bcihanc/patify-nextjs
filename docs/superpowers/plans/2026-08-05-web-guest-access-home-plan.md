# Web Guest Access + Mobile-Like Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` show the Lost & Found feed in the nav shell and let a logged-out guest browse Lost&Found / Adoptions / Emergency; login is required only for Inbox, Profile, notifications, and every write action.

**Architecture:** The `(app)` layout stops hard-gating: a guest gets a notification-free "guest shell", a logged-in user gets the current shell unchanged. A new `requireAuth()` server helper re-gates the login-only subtrees (chats, notifications, profile-self) and write pages (create/edit/mine). Guest-open detail/map pages drop their hard redirect and treat a null user as "not owner, actions login-wall". `/` redirects to `/lost-found`.

**Tech Stack:** Next.js 15 App Router (route groups), React 19, TypeScript strict, Supabase `@supabase/ssr`.

Spec: `docs/superpowers/specs/2026-08-05-web-guest-access-home-design.md`

## Global Constraints

- Never commit to `main`; never push/deploy. Branch: `feat/web-guest-access`.
- No DB migration / schema / RPC / publication change. Reads via existing masked SECURITY DEFINER RPCs; anon access already granted (mobile guest parity). A runtime `42501`/`22P02` from a guest read is a STOP signal (fail-loud), not a client workaround.
- `database.types.ts` is deliberately stale — do NOT modify it.
- Strict TS (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`). `npm run build` is authoritative; there is no test runner. Do NOT run `npm run build` while a dev server holds `.next`.
- `next` return path must be validated local-only (open-redirect guard): starts with `/`, not `//`, not `/\`.
- **Logged-in behavior must stay unchanged** — this is additive (guest path) + gate relocation, not a rewrite. When a change risks the logged-in path, prefer a separate guest code path over editing the logged-in one.
- Copy is Turkish. Match existing component/style conventions. Writes stay session-authoritative, explicit columns, `.select('id')` zero-row bail, no `.select('*')` on location-bearing tables.
- Each task ends with `npm run build` (report the result) and a conventional commit on `feat/web-guest-access`. Open `git add` (explicit paths).

---

### Task 1: Auth helpers + login `?next=` return

**Files:**
- Create: `lib/auth/next-path.ts` (pure, client-safe)
- Create: `lib/auth/require-auth.ts` (server-only)
- Modify: `app/actions.ts` (`signInAction`, `googleSignInAction`, `appleSignInAction`)
- Modify: `app/(public)/auth/login/page.tsx`
- Modify: `components/login-form.tsx`

**Interfaces:**
- Produces: `safeNextPath(raw: string | null | undefined): string | null`, `loginWallHref(next: string): string` (from `lib/auth/next-path`); `requireAuth(next?: string): Promise<CurrentUserProfile>` (from `lib/auth/require-auth`).

- [ ] **Step 1: Create the pure path helpers**

`lib/auth/next-path.ts`:
```ts
// Validates a post-login return target as a LOCAL path only, blocking
// open-redirects (absolute URLs, protocol-relative `//host`, backslash tricks).
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}

// Builds a login URL that returns to `next` (or the LF feed if `next` is
// unsafe/absent). Pure — safe to import from client components.
export function loginWallHref(next: string | null | undefined): string {
  const safe = safeNextPath(next) ?? '/lost-found';
  return `/auth/login?next=${encodeURIComponent(safe)}`;
}
```

- [ ] **Step 2: Create `requireAuth`**

`lib/auth/require-auth.ts`:
```ts
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { safeNextPath } from '@/lib/auth/next-path';
import type { CurrentUserProfile } from '@/lib/profile/types';

// Server-only gate for login-required pages/layouts. Returns the profile
// (non-null) or redirects to login carrying a return path — the caller's own
// pathname (from the middleware-set x-pathname header) when `next` is omitted.
export async function requireAuth(next?: string): Promise<CurrentUserProfile> {
  const profile = await getCurrentUserProfile();
  if (profile) return profile;
  const fromHeader = (await headers()).get('x-pathname');
  const target = safeNextPath(next) ?? safeNextPath(fromHeader) ?? '/lost-found';
  redirect(`/auth/login?next=${encodeURIComponent(target)}`);
}
```
(`redirect()` throws, so control never returns on the guest path — the `Promise<CurrentUserProfile>` type holds.)

- [ ] **Step 3: Honor `next` in `signInAction`**

In `app/actions.ts`, import `safeNextPath` and change `signInAction` so the final redirect targets the validated `next` or `/lost-found`:
```ts
const next = safeNextPath(formData.get("next") as string | null);
// ...after successful signInWithPassword:
return redirect(next ?? "/lost-found");
```

- [ ] **Step 4: Thread `next` through OAuth actions**

`googleSignInAction`/`appleSignInAction` accept an optional `next` and bake it into the `redirectTo` `?next=` (replacing the hardcoded `/home`/`/lost-found`), validated via `safeNextPath(next) ?? '/lost-found'`. Keep the argless call working (default when undefined).

- [ ] **Step 5: Pass `next` from the login page to the form**

`app/(public)/auth/login/page.tsx`: widen `searchParams` to also carry an optional `next` string and pass it to `LoginForm` as a `next` prop.

- [ ] **Step 6: Emit `next` from the form**

`components/login-form.tsx`: add a `next?: string` prop; render a hidden field inside the email/password `<form>`: `<input type="hidden" name="next" value={next ?? ''} />`; pass `next` into `googleSignInAction(next)` / `appleSignInAction(next)`.

- [ ] **Step 7: Build + commit**

Run `npm run build` (expect clean). Commit: `feat(auth): requireAuth helper + login ?next= return`.

---

### Task 2: Guest shell + nav login flags

**Files:**
- Modify: `components/app-shell/nav-items.ts`
- Create: `components/app-shell/guest-shell.tsx`
- Test/verify: build only (no runner).

**Interfaces:**
- Consumes: `loginWallHref` (Task 1), `NAV_ITEMS`.
- Produces: `GuestShell({ children }: { children: React.ReactNode })` default/named export used by Task 3.

- [ ] **Step 1: Flag login-required nav items**

`components/app-shell/nav-items.ts`: add `requiresLogin?: boolean` to `NavItem` and set it `true` on the `/chats` and `/profile` entries. Do not change hrefs/labels/icons.

- [ ] **Step 2: Build the guest shell**

Create `components/app-shell/guest-shell.tsx` (`'use client'`). Render the SAME chrome as `AppShell` (sticky mobile top bar with a `Patify` link to `/lost-found`; desktop top bar; fixed mobile bottom tab bar) with these differences:
- No `NotificationsProvider`, no `NotificationBell`.
- For a `NAV_ITEMS` entry with `requiresLogin`, render a plain link to `loginWallHref(item.href)` instead of `item.href` (so a guest tap goes to login and returns).
- Replace the desktop profile-avatar block with a "Giriş yap" button linking to `loginWallHref('/profile')`.
- Use `usePathname()` for active state exactly like `AppShell`.

Mirror `AppShell`'s markup/classes so the two shells look identical apart from the auth affordances. Do NOT modify `app-nav.tsx` (`AppShell` stays byte-identical).

- [ ] **Step 3: Build + commit**

`npm run build` (clean). Commit: `feat(app-shell): guest shell + login-required nav flags`.

---

### Task 3: Open the (app) gate for guests + middleware

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `GuestShell` (Task 2).

- [ ] **Step 1: Guest branch in the layout**

`app/(app)/layout.tsx`: after `const profile = await getCurrentUserProfile();`, replace `if (!profile) redirect('/auth/login');` with:
```tsx
if (!profile) {
  return <GuestShell>{children}</GuestShell>;
}
```
Leave the entire logged-in path below (consent gate, gate-page bare render, `AppShell`) unchanged.

- [ ] **Step 2: Shrink the middleware coarse guard**

`lib/supabase/middleware.ts`:
- `AUTHED_PREFIXES = ['/chats', '/profile', '/notifications', '/complete-profile', '/accept-consent']` (remove `/lost-found`, `/adoptions`).
- In `isAuthedPath`, add a public exception for the guest-viewable public profile alongside the existing `/lost-found/item` one:
```ts
if (pathname.startsWith('/lost-found/item')) return false
if (pathname.startsWith('/profile/user/')) return false
```
Keep the `/home` → `/lost-found` redirect.

- [ ] **Step 3: Build + smoke + commit**

`npm run build` (clean). Commit: `feat(gate): render guest shell instead of redirecting; middleware guards login-only trees`.
Note in the report: logged-out `/lost-found` must now render (not redirect); logged-out `/chats` and `/profile` must still redirect to login. (Runtime smoke is done by the controller after merge; state it here as the intended behavior.)

---

### Task 4: Root `/` → feed; Hero moves to `/indir`

**Files:**
- Modify: `app/(public)/page.tsx`
- Create: `app/(public)/indir/page.tsx`

- [ ] **Step 1: Redirect the root**

`app/(public)/page.tsx`:
```tsx
import { redirect } from 'next/navigation';

export default async function Home() {
  redirect('/lost-found');
}
```
Drop the now-unused `Hero` import (strict TS fails on unused imports).

- [ ] **Step 2: Preserve the marketing page at /indir**

Create `app/(public)/indir/page.tsx` that renders the existing `<Hero />` (same wrapper markup the old root used), so the App Store / Play links keep a home.
```tsx
import Hero from '@/components/hero';

export default function IndirPage() {
  return <Hero />;
}
```

- [ ] **Step 3: Build + commit**

`npm run build` (clean; `/indir` in the route list, `/` no longer static). Commit: `feat(home): / redirects to the Lost&Found feed; marketing page moves to /indir`.

---

### Task 5: Re-gate login-only subtrees (chats, notifications, profile-self)

**Files:**
- Create: `app/(app)/chats/layout.tsx`
- Create: `app/(app)/notifications/layout.tsx`
- Move (git mv) profile self-pages into `app/(app)/profile/(self)/` and create `app/(app)/profile/(self)/layout.tsx`

**Interfaces:**
- Consumes: `requireAuth` (Task 1).

- [ ] **Step 1: Chats + notifications gate layouts**

Create each layout:
```tsx
import { requireAuth } from '@/lib/auth/require-auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
```
(One file for `chats`, one for `notifications`.)

- [ ] **Step 2: Move profile self-pages into a `(self)` group**

With `git mv`, move these INTO `app/(app)/profile/(self)/` (URL-invisible group — paths stay `/profile`, `/profile/edit`, …):
`page.tsx`, `edit/`, `settings/`, `blocked/`, `change-password/`, `delete/`, `followers/`, `followings/`, `about/`.
Leave `app/(app)/profile/user/` where it is (OUTSIDE `(self)`), so the public profile stays guest-viewable.

- [ ] **Step 3: Add the profile-self gate layout**

Create `app/(app)/profile/(self)/layout.tsx` identical to Step 1's shape (`await requireAuth();`).

- [ ] **Step 4: Build + commit**

`npm run build` — confirm the route list still shows `/profile`, `/profile/edit`, `/profile/settings`, `/profile/blocked`, `/profile/change-password`, `/profile/delete`, `/profile/followers`, `/profile/followings`, `/profile/about`, and `/profile/user/[id]` (unchanged paths). Commit: `feat(gate): requireAuth layouts for chats/notifications and profile-self group`.

---

### Task 6: `MessageUserButton` guest login-wall

**Files:**
- Modify: `components/chats/message-user-button.tsx`

**Interfaces:**
- Consumes: `loginWallHref` (Task 1).
- Produces: `MessageUserButton` accepting `currentUserId: string | null`.

- [ ] **Step 1: Accept a null viewer and login-wall**

Change the prop type to `currentUserId: string | null`. Keep `if (targetUserId === currentUserId) return null` for the logged-in self case. Add: when `currentUserId == null`, render a login-wall link (same button look) to `loginWallHref('/chats')` (or, if simpler, the current path via a passed prop — but `/chats` is an acceptable default) — a guest tapping "Mesaj" lands on login. All existing logged-in logic (`createChatRepository(currentUserId)`, `startDirectChat`, blocked/error states) runs only when `currentUserId` is a non-null string; TypeScript must see it narrowed (guard early).

- [ ] **Step 2: Build + commit**

`npm run build` (clean). Commit: `feat(chats): MessageUserButton login-walls for guests`.

---

### Task 7: Lost & Found guest access

**Files:**
- Modify: `app/(app)/lost-found/[id]/page.tsx`
- Modify: `app/(app)/lost-found/map/page.tsx`
- Modify: `app/(app)/lost-found/create/page.tsx`, `app/(app)/lost-found/[id]/edit/page.tsx`, `app/(app)/lost-found/mine/page.tsx`

- [ ] **Step 1: Un-gate the detail page**

`lost-found/[id]/page.tsx`: remove `if (!me) redirect('/auth/login');`. Then make everything null-safe:
- `const isOwner = me != null && listing.userId === me.id;`
- cip fetch stays behind `if (isOwner)`.
- `EntityActionMenu currentUserId={me?.id ?? null}` (already accepts null).
- The `!isOwner && <MessageUserButton .../>` block: pass `currentUserId={me?.id ?? null}` (Task 6 makes it login-wall for guests). Keep it rendered for guests (so they get the login-wall), i.e. gate on `!isOwner`.
- Drop the now-unused `redirect` import if nothing else uses it (strict TS).

- [ ] **Step 2: Un-gate the map page**

`lost-found/map/page.tsx`: remove the `if (!me) redirect(...)`; pass the viewer id as nullable (`me?.id ?? null`) wherever it currently passes `me.id`. Drop unused `redirect` import if applicable.

- [ ] **Step 3: Keep write pages gated via requireAuth**

In `create`, `[id]/edit`, `mine`: replace `const me = await getCurrentUserProfile(); if (!me) redirect('/auth/login');` with `const me = await requireAuth();`. Keep the owner checks in `edit` (`if (listing.userId !== me.id) redirect(...)`) and the `me.id` use in `mine`. Remove now-unused `getCurrentUserProfile`/`redirect` imports as needed.

- [ ] **Step 4: Build + commit**

`npm run build` (clean). Commit: `feat(lost-found): guest-browsable detail + map; write pages via requireAuth`.

---

### Task 8: Adoptions guest access

**Files:**
- Modify: `app/(app)/adoptions/[id]/page.tsx`
- Modify: `app/(app)/adoptions/map/page.tsx`
- Modify: `app/(app)/adoptions/create/page.tsx`, `app/(app)/adoptions/[id]/edit/page.tsx`, `app/(app)/adoptions/mine/page.tsx`

- [ ] **Step 1: Un-gate the detail page**

`adoptions/[id]/page.tsx` (mirrors LF detail): remove `if (!me) redirect('/auth/login');`; `const isOwner = me != null && listing.userId === me.id;`; pass `currentUserId={me?.id ?? null}` to `EntityActionMenu` and `MessageUserButton`; keep owner-only UI behind `isOwner`. Drop unused imports.

- [ ] **Step 2: Un-gate the map page**

`adoptions/map/page.tsx`: remove `if (!me) redirect(...)`; nullable viewer id. Drop unused imports.

- [ ] **Step 3: Keep write pages gated via requireAuth**

`create`, `[id]/edit`, `mine`: swap to `const me = await requireAuth();`; keep owner checks and `me.id` uses. Clean unused imports.

- [ ] **Step 4: Build + commit**

`npm run build` (clean). Commit: `feat(adoptions): guest-browsable detail + map; write pages via requireAuth`.

---

### Task 9: Emergency guest access + claim/resolve guest fix

**Files:**
- Modify: `components/emergency/emergency-actions.tsx`
- Modify: `app/(app)/emergency/map/page.tsx`
- Modify: `app/(app)/emergency/create/page.tsx`

**Note:** Emergency detail (`emergency/[id]/page.tsx`) and browse are already guest-safe (`currentUserId = user?.id ?? null`) — do NOT change them.

- [ ] **Step 1: Fix the latent guest bug in emergency actions**

`components/emergency/emergency-actions.tsx`: as written, `canClaim = status === 'acik' && claimedBy == null && reporterUserId !== currentUserId` is TRUE for a guest (`currentUserId` null), so a guest would see and be able to press "Üstlen" (which then fails server-side). Require a logged-in viewer for both write actions:
```ts
const canClaim = currentUserId != null && status === 'acik' && claimedBy == null && reporterUserId !== currentUserId;
const canResolve = currentUserId != null && (isReporter || isClaimer) && status !== 'cozuldu';
```
(Use the file's actual `canResolve` expression; just add the `currentUserId != null` conjunct.) Result: a guest sees none of claim/resolve/DM (the component's `if (!canClaim && !canResolve && !showDm) return null` then renders nothing for guests) — matching mobile, where an anonymous viewer can read the case but is prompted to log in to act. No login-wall button is required here; hiding is the correct guest state for emergency actions.

- [ ] **Step 2: Un-gate the map page**

`emergency/map/page.tsx`: remove `if (!me) redirect(...)`; nullable viewer id. Drop unused imports.

- [ ] **Step 3: Keep create gated via requireAuth**

`emergency/create/page.tsx`: swap to `const me = await requireAuth();`. Clean unused imports.

- [ ] **Step 4: Build + commit**

`npm run build` (clean). Commit: `feat(emergency): guest-safe actions (hide claim/resolve for guests); create via requireAuth`.

---

### Task 10: Public profile guest access + final verification

**Files:**
- Modify: `app/(app)/profile/user/[id]/page.tsx`
- Modify: `components/user/user-profile-actions.tsx` (the `UserProfileActions` follow/DM/block component the page renders)

- [ ] **Step 1: Un-gate the public profile**

`profile/user/[id]/page.tsx`: remove `if (!me) redirect('/auth/login');` and the `if (id === me.id) redirect('/profile');` (guard it as `me != null && id === me.id`). For a guest:
- `isFollowing`/`isBlocked` require a viewer id — skip the calls when `me == null` and use `false`/`false` (do not call with a null id).
- Pass `currentUserId={me?.id ?? null}` to the actions component.
Drop unused imports.

- [ ] **Step 2: Null-safe `UserProfileActions`**

`components/user/user-profile-actions.tsx`: make it accept `currentUserId: string | null`. For a null viewer, the follow/block buttons login-wall (link to `loginWallHref('/profile/user/' + targetId)`) or hide; the DM path already delegates to `MessageUserButton` (Task 6 login-walls). Keep logged-in behavior identical — guard the write handlers so they only run with a non-null `currentUserId`.

- [ ] **Step 3: Build + full logged-out smoke**

`npm run build` (clean, all routes). Then the controller runs the dev server and verifies logged-out: `/` → `/lost-found` (feed renders), LF/Adoptions/Emergency list + a detail + map render (200, no redirect), a profile/user/[id] renders, and `/chats` `/profile` `/notifications` `/lost-found/create` redirect to `/auth/login?next=…`. No 500s. Commit: `feat(profile): guest-viewable public profile; actions login-wall`.

---

## Notes for the executor

- Tasks 7/8/9/10 are the guest null-user surface — the highest-risk area. Each detail/map page must not crash for a null user and must not silently no-op a write for a guest (login-wall or hidden, never a dead button).
- The public detail page `app/(public)/lost-found/item/[id]` is untouched and still public.
- After all tasks + final review, merge to `main` locally with `git merge --no-ff` (mirroring prior phases). NO push.
