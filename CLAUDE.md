# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Patify — a Next.js 15 App Router app. Two distinct concerns live here:
1. **Auth surface** — Supabase cookie-based sessions with email/password and Apple Sign-In.
2. **Public "lost & found" listing pages** — server-rendered, shareable pet-listing pages with dynamic OpenGraph images, backed by a Supabase RPC. These pages are what get shared into WhatsApp/social, so link-preview correctness matters.

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript (strict + `noUncheckedIndexedAccess`)
- Supabase Auth via `@supabase/ssr` (cookie sessions)
- Tailwind CSS 3 + shadcn/ui (Radix primitives), `lucide-react`, `next-themes`, Geist font
- Path alias: `@/*` → repo root (e.g. `@/lib/supabase/server`)

## Commands
- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm start` — serve production build

No test runner or linter is configured in `package.json`. Type errors surface via `npm run build`. There is no `npm run lint` script despite `eslint-disable` comments in source (ESLint runs as part of `next build`).

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (also used to build public storage URLs)
- `PUBLIC_URL` — canonical site origin. Used for Apple OAuth `redirectTo` and OG `metadataBase`. May or may not include a protocol; layout normalizes it (see below).

## Architecture

### Supabase clients — pick by context
- `lib/supabase/server.ts` — Server Components / Server Actions / Route Handlers (`await createClient()`)
- `lib/supabase/client.ts` — Client Components
- `lib/supabase/middleware.ts` — `updateSession()`, called from root `middleware.ts`
- `database.types.ts` — generated Supabase schema types

### Auth flow
- All auth logic is Server Actions in `app/actions.ts` (`signUp/signIn/signOut`, forgot/reset password, `deleteAccount`, `appleSignIn`).
- `encodedRedirect(type, path, message)` (`utils/utils.ts`) carries error/success messages as query params after a redirect — the standard pattern here for surfacing action results.
- OAuth/PKCE callback handler: `app/auth/oauth/route.ts` (`exchangeCodeForSession`). Note: some `redirectTo` values in `actions.ts` point at `/auth/callback` — there is no route by that name in `app/`, so email-confirmation/password-reset links rely on Supabase-side handling. Verify before assuming that path resolves.
- Apple Sign-In config lives as `<meta>` tags in `app/layout.tsx` (client ID `com.bcc.buschat.web`, redirect to the Supabase `/auth/v1/callback`).
- **Two distinct `reset-password` routes — don't conflate them.** `/reset-password` (`app/reset-password/`) is a top-level **universal-link landing page** for the mobile apps' Supabase recovery flow: on iOS/Android the native app intercepts the link; this page is the desktop/no-app fallback. It handles both PKCE (`?code=` → `exchangeCodeForSession` server-side) and implicit (`#access_token=…` → `hash-recovery-handler.tsx`, a client component, since hash fragments never reach the server), then forwards to `/home/reset-password`, which owns the actual new-password form.

### Middleware — refreshes everywhere, guards only `/home`
`middleware.ts` runs `updateSession` on every non-static request (matcher excludes `_next/*`, images, favicon) to keep the session cookie fresh. **The only route it redirects unauthenticated users away from is exactly `/home`** — `/home/reset-password`, `/protected`, etc. are NOT guarded by middleware. Add explicit checks in those pages if they need protection.

### Lost & Found (public shareable pages)
- Data access: `lib/lost-found.ts` — `getLostFoundById()` calls Supabase RPC `get_lost_found_by_id`, maps snake_case rows to a camelCase `LostFoundListing`, and turns bare image filenames into full URLs against the **public** `assets` storage bucket.
- Domain types are Turkish-valued: `LfStatus` is `'kayip' | 'bulundu' | 'cozuldu'` (lost / found / reunited); `PetType` labels map to Turkish in `PET_TYPE_LABELS`. Listing UI copy is Turkish.
- Route: `app/lost-found/item/[id]/page.tsx` renders the listing (reunited status shows a celebration screen). Uses plain `<img>` on purpose — `next/image` `remotePatterns` is intentionally not configured yet.
- Dynamic OG image: `app/lost-found/item/[id]/opengraph-image.tsx` via `next/og` (Satori).

### Non-obvious constraints (these have bitten before — read the inline comments before touching)
- **Satori requires `display:flex` on any element with >1 child.** In the OG image, the headline is built as a single string so its `<div>` stays single-child. Adding child nodes without `display:flex` breaks image generation.
- **`metadataBase` must never fall back to localhost in production** — WhatsApp/social crawlers can't fetch localhost, so previews break. `app/layout.tsx` defaults to `https://patify.net` when `NODE_ENV==='production'` and normalizes `PUBLIC_URL` so a protocol-carrying value doesn't produce `https://https://…`.
- **Strict TS beyond `strict`.** `tsconfig.json` also enables `noUncheckedIndexedAccess` (array indexing yields `T | undefined` — hence non-null assertions like `rows[0]!` with disable comments; keep that pattern), plus `noImplicitReturns`, `noUnusedLocals`, and `noUnusedParameters`. The last two fail `next build` on any unused import or variable, so drop dead imports rather than leaving them.

### Routes
- `/` landing · `/protected` example protected page
- `/auth/login`, `/auth/error`, `/auth/oauth` (callback)
- `/(auth-pages)/forgot-password`
- `/reset-password` (top-level universal-link recovery landing → forwards to `/home/reset-password`; see Auth flow)
- `/home` (protected), `/home/reset-password` (new-password form)
- `/lost-found/item/[id]` (public listing + OG image)
- Support/legal: `/cr` (copyright), `/pp` (privacy), `/tos`, `/csae`. Long-form legal text is Markdown in `app/(support-pages)/_content/` (TR + EN), rendered via `react-markdown` + `remark-gfm`.

## Deployment
Netlify (see `.netlify/`, `netlify.toml`, `deno.lock` for edge functions). README mentions Vercel as an option, but the committed tooling targets Netlify.
