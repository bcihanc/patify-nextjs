---
name: scaffold-feature-module
description: Scaffold a new lib/<feature>/ domain module for patify-nextjs using the established read/actions/types/filters pattern. Use when adding a new listing-style feature (or a feature add-on like adoption applications) that follows the adoptions/emergency/lost-found shape. Not for one-off helpers.
---

# Scaffold a `lib/<feature>/` domain module

Every listing feature in this repo (`lib/adoptions/`, `lib/emergency/`, `lib/lost-found/`) shares
one file shape and a set of **load-bearing conventions**. When adding a new feature that fits this
mold, clone the closest existing module rather than writing from scratch — this skill captures the
shape and the non-obvious rules so the clone is faithful.

## Before you start
- **Pick the template.** `lib/emergency/` is the smallest, cleanest exemplar (browse + nearby +
  in-bounds + by-id + create + two RPC mutations). `lib/adoptions/` is the fullest (edit/mine/owner
  actions). Clone the one whose feature set matches, then delete what you don't need.
- **Check mobile parity first.** This is a port — run the `parity-check` agent (or read
  `/Users/cihan/IdeaProjects/patify/lib/features/<feature_snake>/{models,data}/`) to get the exact
  enum values, field set, status machine, and RPC names/params BEFORE writing types.
- **The web `database.types.ts` is deliberately stale.** RPCs live in the prod DB, not in generated
  types. So every `.rpc()` is called untyped with a hand-written `.returns<Row[]>()`. Do NOT
  regenerate or edit `database.types.ts`. The compiler will not catch a wrong RPC name or param — the
  `parity-check` agent and a runtime smoke test are the only guards.

## The four files

### `types.ts` — the single source of shapes (client-safe, NO server-only imports)
Client components import this, so it must never pull in `@/lib/supabase/server`.
- `export type XKind`/`XStatus = '...' | '...'` — **Turkish-valued** domain unions, byte-exact to mobile.
- `X_KIND_LABELS`/`X_STATUS_LABELS: Record<…, string>` — Turkish UI labels; must cover every value.
- `export const PER_PAGE = 10;` — lives here (shared by server `read.ts` and client browse-list).
- `XRow` (snake_case, the RPC row shape) and `XListing` (camelCase, the app shape).
- `XFilters` + `EMPTY_X_FILTERS`.
- Re-export shared pet types from `@/lib/lost-found/types` (`PetType`, `PET_TYPE_LABELS`, `petTypeLabel`).

### `read.ts` — RPC wrappers (server-only)
- `const STORAGE_PUBLIC_BASE = \`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets\`;`
  and `const toImageUrl = (f) => \`${STORAGE_PUBLIC_BASE}/${f}\`;` — bare filenames → public `assets` URLs.
- `mapRowToX(r: XRow): XListing` — the snake→camel mapper; wrap images with `toImageUrl`.
- One async fn per RPC: `browseX` / `nearbyX` / `xInBounds` / `getXById`, each:
  ```ts
  const { data, error } = await supabase.rpc('rpc_name', { …params }).returns<XRow[]>();
  if (error || !data) { if (error) console.error('fnName:', error.message); return []; } // getById: return null
  return (data as XRow[]).map(mapRowToX);
  ```
- `getXById` returns `XListing | null`: bail `null` on empty rows; the last line is
  `return mapRowToX(rows[0]!);` with `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion`
  above it (required by `noUncheckedIndexedAccess`).
- **Location masking is server-side.** Non-owner reads get MASKED lat/long (~100–150m grid) from the
  RPC; owner reads get raw. The web client never masks or unmasks — it trusts the RPC. Emergency is
  the exception (street animals → unmasked); if your feature protects an owner's home, it is masked.

### `actions.ts` — Server Actions (`'use server'`)
- Every mutation starts with `const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: 'Oturum bulunamadı.' };`
- Writes are **session-authoritative**: `reporter_user_id`/`user_id` comes from `user.id`, NEVER client input.
- Insert an **explicit column list**, then `.select('id').single()` — `.select('*')` is FORBIDDEN
  (location columns have SELECT revoked → 42501). Zero-row / error → return `{ error }`, don't throw.
- `clean(s)` helper: `trim()` + empty→null. Return type is a `{ ok: true; id? } | { error: string }` union.
- Thin `loadBrowseXAction` / `xInBoundsAction` wrappers exist so `'use client'` components can reach
  the server-only `read.ts` fns.

### `filters.ts` — filter persistence (server-safe, no server-only imports)
- `localStorage` snapshot under a **distinct** `STORAGE_KEY` (e.g. `'emergency_filters'`).
- `decodeEnumList`/`decodeStringOrNull`/`decodeNumberOrNull` — every field falls back to its
  `EMPTY_X_FILTERS` default individually, so a renamed enum or hand-edited value never throws.
- Snapshot is **owner-stamped**: `loadFilterSnapshot(ownerId)` returns empty if stamped for a
  different account (no filter leak on shared devices). `search` is excluded from the snapshot.
- `withCity`/`withDistrict`/`withRadius` are mutually exclusive (city/district OR radius, never both).

## Then wire the UI (mirror the template)
`app/(app)/<feature>/{page,create,[id],[id]/edit,map,mine}` + `components/<feature>/*`
(browse-list, filter-bar, card, status-badge, owner-actions). Add the nav entry. Gate write pages
with `requireAuth()` (`lib/auth/require-auth.ts`); browse/detail may stay guest-visible if the RPC
is anon-open (LF detail + public profile are anon-CLOSED — check before exposing to guests).

## Verify — build is the sole authority
There is no test runner or lint script. The proving check is:
```
npm run build          # typecheck + ESLint (noUnusedLocals/noUnusedParameters fail on dead imports)
```
Green build + a manual dev-server / curl walkthrough = done. Stale-LSP diagnostics
(2307/2724/6385/71007) about the untyped RPCs are false alarms — the build is the truth.
Runtime auth-gated / realtime flows need a real test identity (see `CLAUDE.local.md`) and are
fail-loud until verified. Do not add a Jest/Vitest runner — build-as-authority is deliberate here.
