# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Patify — a Next.js 16 App Router pet community app. Two route groups split the app by trust boundary:
1. **`app/(app)/` — the authenticated app.** A full social surface behind a Supabase session: lost & found, adoptions, emergency, chats (realtime DM), notifications, profiles + follow, complete-profile onboarding, consent gate, feedback, reports/trust/blocking. Each feature has a matching `lib/<feature>/` domain module.
2. **`app/(public)/` — the public/unauthenticated surface.** Auth pages, support/legal pages, and the server-rendered, shareable **lost & found item** pages (`/lost-found/item/[id]`) with dynamic OpenGraph images, backed by a Supabase RPC. These get shared into WhatsApp/social, so link-preview correctness matters. Public guest profiles (`/profile/user/[id]`) live here too.

Auth itself is Supabase cookie-based sessions (email/password + Apple Sign-In).

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript 6 (strict + `noUncheckedIndexedAccess`)
- Supabase Auth via `@supabase/ssr` (cookie sessions); Apple Sign-In via `apple-signin-auth`
- Tailwind CSS 4 + shadcn/ui (Radix primitives), `lucide-react`, `next-themes`, Geist font
- Google Maps via `@vis.gl/react-google-maps` (map views for lost-found/adoptions/emergency)
- Cloudflare Turnstile (`@marsidev/react-turnstile`) — bot protection on the public sighting form only
- `prettier` for formatting (no lint/test runner — see Commands)
- Path alias: `@/*` → repo root (e.g. `@/lib/supabase/server`)

## Commands
- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm start` — serve production build

No test runner or linter is configured in `package.json`. Type errors surface via `npm run build`. **ESLint is not installed at all** — no `eslint` dependency, no config — so `next build` does NOT lint, and the `eslint-disable` comments scattered in source are inert legacy no-ops. `prettier` is a dependency but has no npm script — run it via `npx prettier`.

- **`next.config.ts` sets `agentRules: false`.** Next 16 otherwise appends its own "agent rules" block to this CLAUDE.md on every dev/build. This file is hand-maintained — keep the opt-out, don't remove the flag.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (also used to build public storage URLs). **Required** — `instrumentation.ts` fails loud (throws on boot) if either is missing.
- `PUBLIC_URL` — canonical site origin. Used for Apple OAuth `redirectTo` and OG `metadataBase`. May or may not include a protocol; layout normalizes it (see below). **Optional** — missing only warns.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — enables map views. **Optional** — `hasMapsKey()` (`lib/maps/google-maps.ts`) gates all map rendering so a missing key degrades gracefully instead of crashing.

**`instrumentation.ts` (boot-time env check) — fail-loud only on the two required Supabase vars.** `PUBLIC_URL` and the Maps key are treated as optional (warn, don't throw). Making them fatal took the whole prod site to 500 once — don't re-add them to the required list.

## Architecture

### Supabase clients — pick by context
- `lib/supabase/server.ts` — Server Components / Server Actions / Route Handlers (`await createClient()`)
- `lib/supabase/client.ts` — Client Components
- `lib/supabase/middleware.ts` — `updateSession()`, called from root `middleware.ts`
- `database.types.ts` — generated Supabase schema types

### Feature domain modules — `lib/<feature>/`
Each authenticated feature has a `lib/` module (typically `read.ts` for queries, `actions.ts` for Server Actions, `types.ts`, `filters.ts`). The matching UI is `app/(app)/<feature>/`.
- `lib/adoptions/`, `lib/emergency/`, `lib/lost-found/` — the three listing features (browse list + map view + create/edit/detail).
- `lib/chats/` — realtime DM (`repository.ts`, `realtime.ts`, `dm.ts`).
- `lib/notifications/` — in-app notifications (`read.ts`, `actions.ts`, `copy.ts`).
- `lib/profile/` — current + public profiles, DM prefs; `lib/follow/` — follow graph; `lib/trust/` + `lib/reports/` — blocking/reporting.
- `lib/auth/` — `gate.ts` (onboarding/consent redirect logic), `require-auth.ts`, `next-path.ts` (safe-redirect), `error-messages.ts`.
- `lib/maps/` — Google Maps provider + `hasMapsKey()` degrade gate. `lib/geo/turkey.ts` — TR city/district data.
- `lib/storage/` — avatar + listing-image upload helpers. `lib/consent.ts`, `lib/feedback/`, `lib/share.ts`, `lib/sighting.ts`, `lib/social/safe-url.ts`.

### Auth flow
- All auth logic is Server Actions in `app/actions.ts` (`signUp/signIn/signOut`, forgot/reset password, `deleteAccount`, `appleSignIn`).
- `encodedRedirect(type, path, message)` (`utils/utils.ts`) carries error/success messages as query params after a redirect — the standard pattern here for surfacing action results.
- OAuth/PKCE callback handler: `app/(public)/auth/oauth/route.ts` (`exchangeCodeForSession`). Note: some `redirectTo` values in `actions.ts` point at `/auth/callback` — there is no route by that name in `app/`, so email-confirmation/password-reset links rely on Supabase-side handling. Verify before assuming that path resolves.
- Apple Sign-In config lives as `<meta>` tags in `app/layout.tsx` (client ID `com.bcc.buschat.web`, redirect to the Supabase `/auth/v1/callback`).
- **Two distinct `reset-password` routes — don't conflate them.** `/reset-password` (`app/(public)/reset-password/`) is a **universal-link landing page** for the mobile apps' Supabase recovery flow: on iOS/Android the native app intercepts the link; this page is the desktop/no-app fallback. It handles both PKCE (`?code=` → `exchangeCodeForSession` server-side) and implicit (`#access_token=…` → `hash-recovery-handler.tsx`, a client component, since hash fragments never reach the server), then forwards to `/home/reset-password` (`app/(public)/home/reset-password/`), which owns the actual new-password form.

### Middleware — refreshes session, coarse-guards the `(app)` surface
`middleware.ts` → `updateSession` (`lib/supabase/middleware.ts`) runs on every non-static request (matcher excludes `_next/*`, images, favicon). It does three things:
1. **Refreshes the session cookie** (the `getUser()` call — do not move/remove it; see inline warnings).
2. **Forwards `x-pathname` as a REQUEST header** so `app/(app)/layout.tsx` can read the current path (Next 16 server components can't read it natively; a response header wouldn't be visible to `headers()`).
3. **Coarse auth guard:** unauthenticated requests to `AUTHED_PREFIXES` (`/chats`, `/profile`, `/notifications`, `/complete-profile`, `/accept-consent`) redirect to `/auth/login`. Public exceptions carved out: `/lost-found/item/*` (crawlable listing) and `/profile/user/*` (guest profile).

**This is only the coarse pass — the authoritative gate is `app/(app)/layout.tsx`** (`resolveGateRedirect` in `lib/auth/gate.ts`): no profile → `GuestShell`; otherwise enforces username + consent (`/complete-profile`, `/accept-consent`) before rendering the app shell. Feature routes like `/adoptions`, `/emergency`, `/lost-found` (the authed browse, not `/lost-found/item/*`) are guarded by the layout, not listed in `AUTHED_PREFIXES`.

**`/home` is legacy** — middleware redirects it to `/lost-found` (the current post-login target). It is not a protected page anymore.

### Lost & Found — TWO data layers, don't conflate them
- **Public layer: `lib/lost-found.ts` (flat file).** `getLostFoundById()` — anon (cookie-free) Supabase client wrapped in `unstable_cache` (60s revalidate, `lf-${id}` tag), calls RPC `get_lost_found_by_id`, maps snake_case → camelCase `LostFoundListing`, and turns bare filenames into full URLs against the **public** `assets` bucket. Cookie-free because `unstable_cache` forbids `cookies()`/`headers()`.
- **Authed layer: `lib/lost-found/` (directory).** `read.ts`/`actions.ts`/`filters.ts`/`types.ts` for the in-app browse/create/edit flows (session-scoped). This is a separate module from the flat public file above.
- Domain types are Turkish-valued: `LfStatus` is `'kayip' | 'bulundu' | 'cozuldu' | 'pasif'` (lost / found / reunited / inactive); `PetType` keys are English, labels map to Turkish in `PET_TYPE_LABELS`. UI copy is Turkish.
- Public route: `app/(public)/lost-found/item/[id]/page.tsx` renders the shareable listing (reunited status shows a celebration screen). Uses plain `<img>` on purpose — `next/image` `remotePatterns` is intentionally not configured yet.
  - Sighting subpage `.../item/[id]/gordum/` — anonymous "I saw this pet" report form, protected by Cloudflare Turnstile (`lib/sighting.ts`).
- Dynamic OG image: `app/(public)/lost-found/item/[id]/opengraph-image.tsx` via `next/og` (Satori).

### Non-obvious constraints (these have bitten before — read the inline comments before touching)
- **Satori requires `display:flex` on any element with >1 child.** In the OG image, the headline is built as a single string so its `<div>` stays single-child. Adding child nodes without `display:flex` breaks image generation.
- **`metadataBase` must never fall back to localhost in production** — WhatsApp/social crawlers can't fetch localhost, so previews break. `app/layout.tsx` defaults to `https://patify.net` when `NODE_ENV==='production'` and normalizes `PUBLIC_URL` so a protocol-carrying value doesn't produce `https://https://…`.
- **Strict TS beyond `strict`.** `tsconfig.json` also enables `noUncheckedIndexedAccess` (array indexing yields `T | undefined` — hence non-null assertions like `rows[0]!` with disable comments; keep that pattern), plus `noImplicitReturns`, `noUnusedLocals`, and `noUnusedParameters`. The last two fail `next build` on any unused import or variable, so drop dead imports rather than leaving them.
- **jsonb columns pass through RPCs verbatim — nest their sub-keys in snake_case to match mobile.** Each `read.ts` maps snake_case→camelCase for top-level RPC columns only; keys **inside** a jsonb column (`adoptions.extra_info`, and the pending `application_questions`) are NOT remapped. Write and read those sub-keys as snake_case (`health_notes`, not `healthNotes`), or the values silently read back empty on the mobile app and vice-versa. This already bit `extra_info` — fixed by writing snake_case plus a legacy-camelCase read fallback (`lib/adoptions/{actions,read}.ts`).

### KVKK / location masking — owner-aware, server-side (don't re-derive this every time)
Listing coordinates are privacy-masked **in the Supabase RPC, not in web code**. This is a cross-cutting rule that keeps getting re-discovered — treat it as fixed:
- **Lost & Found + Adoptions: owner-aware masking.** Non-owner reads receive MASKED `lat`/`long` (grid ~100–150m) to protect the owner's home; the owner's own read receives raw coordinates. The mask is applied by the RPC; the web client never masks or unmasks — it renders whatever the RPC returns (`lib/lost-found/types.ts:32`, `lib/adoptions/types.ts:61`).
- **Emergency: intentionally UNMASKED.** A street animal has no home to protect, so `lat`/`long` come through raw and the real location is shown on the map (`lib/emergency/{types,read}.ts`, spec §8). Do not add masking to Emergency to "match" the others — the delta is deliberate.
- **Never `.select('*')` on a listing table in a Server Action** — the location columns have SELECT revoked (→ 42501). Insert with an explicit column list and `.select('id')`. Writes are session-authoritative: the owner id comes from `auth.getUser()`, never client input.
- Guest visibility is a separate axis: LF in-app detail + public profile RPCs are anon-CLOSED (login-gated), while Adoptions/Emergency detail RPCs are anon-open. Check the RPC's anon grant before exposing a page to guests.

### Routes
Route groups don't affect URLs — they only pick the layout/trust boundary. `(app)` = authenticated (gated by `app/(app)/layout.tsx`); `(public)` = unauthenticated.

**`app/(app)/` — authenticated:**
- Listings: `/lost-found`, `/adoptions`, `/emergency` — each with `/create`, `/[id]`, `/[id]/edit` (adoptions/lost-found), `/map`, and `/mine` (lost-found/adoptions).
- `/chats`, `/chats/[roomId]` (realtime DM) · `/notifications`
- `/profile` (self) → `about`, `edit`, `settings`, `followers`, `followings`, `blocked`, `change-password`, `delete`; public profile `/profile/user/[id]`
- Onboarding gates: `/complete-profile` (username + avatar/bio wizard), `/accept-consent`

**`app/(public)/` — public:**
- `/` landing · `/indir` (app-download landing)
- `/lost-found/item/[id]` (shareable listing + OG image; `+/gordum` sighting form)
- Auth: `/sign-up`, `/forgot-password`, `/auth/error`, `/auth/oauth` (OAuth callback)
- Recovery: `/reset-password` (universal-link landing → `/home/reset-password` new-password form); `/home` redirects to `/lost-found`
- Support/legal: `/cr`, `/pp`, `/tos`, `/csae`. Long-form text is Markdown in `app/(public)/(support-pages)/_content/` (TR + EN), rendered via `react-markdown` + `remark-gfm`.

**Top-level (outside groups):** `/auth/login`, `/protected` (example), plus `error.tsx` / `global-error.tsx` / `not-found.tsx`.

## Deployment
Netlify — the local `.netlify/` build dir (gitignored) and `deno.lock` (edge functions) are the traces; there is no committed `netlify.toml`. README mentions Vercel as an option, but the tooling targets Netlify.
