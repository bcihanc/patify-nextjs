# F2 — Kullanıcı & Profil: Sosyal Katman Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web'e sosyal katmanı ekle — gerçek kendi-profil sayfası, public profil (`/profile/user/:id`), takip/engelle aksiyonları ve kendi takipçi/takip listeleri; tümü mevcut Supabase şemasına karşı (migration yok).

**Architecture:** Okumalar Server Component + `lib/` server fonksiyonları (tek round-trip, gizlilik sınırı server'da); mutasyonlar `app/actions.ts` Server Action'ları (session-authoritative, F0 `unblockUserAction` kalıbı); buton durumu istemci optimistic + `router.refresh()`. Bileşenler `components/user/` altında; başlık (`ProfileHeader`) hem kendi hem public profilde paylaşılır.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`, Tailwind + shadcn/ui, lucide-react.

## Global Constraints

- **Dil:** TR-only; tüm UI metni Türkçe.
- **TS strict:** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` açık. Kullanılmayan import/değişken `next build`'i düşürür — ölü import bırakma; dizi indeksinde `x[i]!` + `// eslint-disable` kalıbı (F0).
- **Backend değişmez:** migration YOK, şema değişikliği YOK. Tüm tablolar mevcut: `user_followings(user_id, followed_user_id, created_at)`, `user_blockings(user_id, blocked_user_id)`, `user_profiles`.
- **Supabase client:** Server Component/Action → `await createClient()` (`@/lib/supabase/server`); Client Component → `createClient()` (`@/lib/supabase/client`).
- **PII sınırı:** başka kullanıcı için ASLA `user_private`, ASLA `user_profiles.*` — açık public kolon listesi.
- **Mutasyon deseni:** `getUser()` gate → yoksa `redirect('/auth/login')`; `user_id` daima session'dan, client'tan sadece `targetUserId`; RLS ikinci savunma; self-action reddi; idempotent insert (unique violation → sessiz başarı).
- **Görsel:** avatarlar `<img>` + `// eslint-disable-next-line @next/next/no-img-element` (F0 kalıbı; `next/image remotePatterns` yapılandırılmadı).
- **Rota paritesi:** `/profile`, `/profile/user/:id`, `/profile/followers`, `/profile/followings` — hepsi `app/(app)/` altında (F0 gate zinciri korur).
- **Test:** repo'da test runner yok. Her task doğrulaması = `npm run build` temiz. Çalışma-zamanı doğrulaması faz sonunda Chrome MCP smoke ile (Task 8 sonrası).
- **Commit:** her task conventional commit; `feat/web-f2-user-social` branch'inde; main'e ASLA commit; push/deploy ASLA.

## File Structure

| Dosya | Sorumluluk | Task |
|---|---|---|
| `lib/social/safe-url.ts` | `safeSocialUrl` + host allow-list sabitleri | 1 |
| `lib/profile/types.ts` (genişlet) | `PublicUserProfile`, `PublicUserSummary`, `FollowCounts` | 2 |
| `lib/profile/public.ts` | `getPublicProfile(id)` — public kolonlar | 2 |
| `lib/follow/server.ts` | `getFollowCounts`, `isFollowing`, `isBlocked`, `listFollowers`, `listFollowing` | 2 |
| `app/actions.ts` (ekle) | `followUserAction`, `unfollowUserAction`, `blockUserAction`, `unblockUserActionById` | 3 |
| `components/user/user-avatar.tsx` | Avatar (foto veya baş harf) | 4 |
| `components/user/social-links.tsx` | Güvenli sosyal link ikonları | 4 |
| `components/user/user-list-row.tsx` | Liste satırı → profile link | 4 |
| `components/user/follow-button.tsx` | Optimistic takip butonu | 5 |
| `components/user/block-button.tsx` | Optimistic engelle butonu | 5 |
| `components/user/user-profile-actions.tsx` | Follow+Block koordinasyonu (client) | 5 |
| `components/user/profile-header.tsx` | Paylaşılan profil başlığı | 6 |
| `app/(app)/profile/page.tsx` (değiş) | Gerçek kendi-profil | 6 |
| `app/(app)/profile/user/[id]/page.tsx` | Public profil | 7 |
| `app/(app)/profile/followers/page.tsx` | Kendi takipçilerin | 8 |
| `app/(app)/profile/followings/page.tsx` | Kendi takip ettiklerin | 8 |

---

### Task 1: safeSocialUrl güvenli link yardımcısı

**Files:**
- Create: `lib/social/safe-url.ts`

**Interfaces:**
- Produces: `safeSocialUrl(input: string | null | undefined, allowedHosts: Set<string>): string | null`; `INSTAGRAM_HOSTS`, `TIKTOK_HOSTS`, `FACEBOOK_HOSTS`, `X_HOSTS`, `TELEGRAM_HOSTS: Set<string>`.

- [ ] **Step 1: Dosyayı oluştur**

`lib/social/safe-url.ts`:
```ts
// Mobil PatifyValidators.safeSocialUrl (lib/utils/validators.dart) TS portu.
// Sosyal linkler kullanıcı-girdisi keyfi string'lerdir; yalnızca https ve
// allow-list host'una çözülen değer döndürülür — crafted look-alike host
// (ör. https://instagram-login.evil.tr) veya javascript:/mailto: reddedilir.

export const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
export const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com']);
export const FACEBOOK_HOSTS = new Set([
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
]);
export const X_HOSTS = new Set([
  'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com',
]);
export const TELEGRAM_HOSTS = new Set([
  't.me', 'telegram.me', 'www.telegram.me', 'telegram.org',
]);

export function safeSocialUrl(
  input: string | null | undefined,
  allowedHosts: Set<string>,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Şemasız "instagram.com/handle" → https'e zorla; yabancı şema (javascript:,
  // mailto:, ftp://…) korunur ve aşağıdaki https kontrolünde reddedilir.
  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  let uri: URL;
  try {
    uri = new URL(candidate);
  } catch {
    return null;
  }
  if (uri.protocol !== 'https:') return null;
  const host = uri.host.toLowerCase();
  if (!host || !allowedHosts.has(host)) return null;
  return uri.toString();
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: temiz (yeni modül, kullanan yok — TS `noUnusedLocals` modül-seviyesi export'ları etkilemez).

- [ ] **Step 3: Commit**

```bash
git add lib/social/safe-url.ts
git commit -m "feat(f2): safeSocialUrl + host allow-lists (mobil validator portu)"
```

---

### Task 2: Tipler + okuma veri katmanı

**Files:**
- Modify: `lib/profile/types.ts`
- Create: `lib/profile/public.ts`
- Create: `lib/follow/server.ts`

**Interfaces:**
- Consumes: `@/lib/supabase/server` `createClient` (async); `@/database.types` `Database`.
- Produces:
  - `PublicUserProfile`, `PublicUserSummary`, `FollowCounts` (types.ts)
  - `getPublicProfile(id: string): Promise<PublicUserProfile | null>`
  - `getFollowCounts(userId: string): Promise<FollowCounts>`
  - `isFollowing(followerId: string, followedId: string): Promise<boolean>`
  - `isBlocked(blockerId: string, blockedId: string): Promise<boolean>`
  - `listFollowers(userId: string): Promise<PublicUserSummary[]>`
  - `listFollowing(userId: string): Promise<PublicUserSummary[]>`

- [ ] **Step 1: types.ts genişlet**

`lib/profile/types.ts` sonuna ekle (mevcut `CurrentUserProfile` korunur):
```ts
// Başka bir kullanıcının GÖRÜNÜR profili — asla owner-only PII (user_private) içermez.
export type PublicUserProfile = Pick<
  ProfileRow,
  | 'id'
  | 'username'
  | 'bio'
  | 'profile_photo'
  | 'x_url'
  | 'instagram_url'
  | 'telegram_url'
  | 'tiktok_url'
  | 'facebook_url'
>;

// Takipçi/takip listelerinde satır için hafif özet.
export type PublicUserSummary = Pick<ProfileRow, 'id' | 'username' | 'profile_photo'>;

export type FollowCounts = { followers: number; following: number };
```
(`ProfileRow` zaten dosyanın başında tanımlı: `type ProfileRow = Database['public']['Tables']['user_profiles']['Row']`.)

- [ ] **Step 2: getPublicProfile oluştur**

`lib/profile/public.ts`:
```ts
import { createClient } from '@/lib/supabase/server';
import type { PublicUserProfile } from './types';

// Başka bir kullanıcının public profili. `*` KULLANILMAZ — açık public kolon
// listesiyle user_private/PII kolonlarının sızması engellenir. RLS de owner-only
// alanları korur; bu ikinci savunma.
const PUBLIC_COLUMNS =
  'id, username, bio, profile_photo, x_url, instagram_url, telegram_url, tiktok_url, facebook_url';

export async function getPublicProfile(id: string): Promise<PublicUserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getPublicProfile:', error.message);
    return null;
  }
  return data;
}
```

- [ ] **Step 3: follow/server.ts oluştur**

`lib/follow/server.ts`:
```ts
import { createClient } from '@/lib/supabase/server';
import type { FollowCounts, PublicUserSummary } from '@/lib/profile/types';

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const supabase = await createClient();
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('user_followings')
      .select('user_id', { count: 'exact', head: true })
      .eq('followed_user_id', userId),
    supabase
      .from('user_followings')
      .select('followed_user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_followings')
    .select('user_id')
    .eq('user_id', followerId)
    .eq('followed_user_id', followedId)
    .maybeSingle();
  return data != null;
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_blockings')
    .select('user_id')
    .eq('user_id', blockerId)
    .eq('blocked_user_id', blockedId)
    .maybeSingle();
  return data != null;
}

export async function listFollowers(userId: string): Promise<PublicUserSummary[]> {
  const supabase = await createClient();
  // Kolon-hint embed: user_followings'in user_id → user_profiles FK'sını seçer
  // (iki FK var; kolon adı disambiguates). Mobil listFollowers ile aynı kalıp.
  const { data, error } = await supabase
    .from('user_followings')
    .select('follower:user_id(id, username, profile_photo)')
    .eq('followed_user_id', userId)
    .returns<{ follower: PublicUserSummary }[]>();
  if (error) {
    console.error('listFollowers:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.follower);
}

export async function listFollowing(userId: string): Promise<PublicUserSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_followings')
    .select('followed:followed_user_id(id, username, profile_photo)')
    .eq('user_id', userId)
    .returns<{ followed: PublicUserSummary }[]>();
  if (error) {
    console.error('listFollowing:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.followed);
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: temiz. (Embed tip uyumsuzluğu olursa `.returns<>()` override'ı çözer.)

- [ ] **Step 5: Commit**

```bash
git add lib/profile/types.ts lib/profile/public.ts lib/follow/server.ts
git commit -m "feat(f2): public profile + follow read layer (counts, isFollowing, isBlocked, lists)"
```

---

### Task 3: Follow/block mutasyon Server Action'ları

**Files:**
- Modify: `app/actions.ts` (dosya sonuna ekle)

**Interfaces:**
- Consumes: mevcut `createClient` (`@/lib/supabase/server`) import'u dosyada var; `redirect` (`next/navigation`) var.
- Produces:
  - `followUserAction(targetUserId: string): Promise<{ ok: true } | { error: string }>`
  - `unfollowUserAction(targetUserId: string): Promise<{ ok: true } | { error: string }>`
  - `blockUserAction(targetUserId: string): Promise<{ ok: true } | { error: string }>`
  - `unblockUserActionById(targetUserId: string): Promise<{ ok: true } | { error: string }>`

**Not:** Mevcut FormData tabanlı `unblockUserAction` (`/profile/blocked` sayfası için) **dokunulmaz**; `unblockUserActionById` yeni buton için argümanlı ayrı bir action'dır.

- [ ] **Step 1: Action'ları ekle**

`app/actions.ts` sonuna (mevcut `"use server"` başlığı ve import'lar geçerli):
```ts
// ── F2 sosyal katman: follow/block mutasyonları ──────────────────────────────
// Hepsi session-authoritative: user_id daima getUser()'dan, client'tan yalnızca
// targetUserId. RLS ikinci savunma. insert'ler idempotent (unique violation →
// sessiz başarı) — çift tık hata üretmez. Buton client'ı dönüşü yorumlar.

type SocialActionResult = { ok: true } | { error: string };

// Postgres unique-violation kodu — zaten-takip / zaten-engelli çift insert'te.
const PG_UNIQUE_VIOLATION = '23505';

export const followUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId || targetUserId === user.id) {
    return { error: 'Geçersiz istek.' };
  }

  const { error } = await supabase
    .from('user_followings')
    .insert({ user_id: user.id, followed_user_id: targetUserId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) {
    console.error('followUserAction:', error.message);
    return { error: 'Takip edilemedi, tekrar dene.' };
  }
  return { ok: true };
};

export const unfollowUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId) return { error: 'Geçersiz istek.' };

  const { error } = await supabase
    .from('user_followings')
    .delete()
    .eq('user_id', user.id)
    .eq('followed_user_id', targetUserId);
  if (error) {
    console.error('unfollowUserAction:', error.message);
    return { error: 'Takip bırakılamadı, tekrar dene.' };
  }
  return { ok: true };
};

export const blockUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId || targetUserId === user.id) {
    return { error: 'Geçersiz istek.' };
  }

  const { error } = await supabase
    .from('user_blockings')
    .insert({ user_id: user.id, blocked_user_id: targetUserId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) {
    console.error('blockUserAction:', error.message);
    return { error: 'Engellenemedi, tekrar dene.' };
  }
  return { ok: true };
};

export const unblockUserActionById = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId) return { error: 'Geçersiz istek.' };

  const { error } = await supabase
    .from('user_blockings')
    .delete()
    .eq('user_id', user.id)
    .eq('blocked_user_id', targetUserId);
  if (error) {
    console.error('unblockUserActionById:', error.message);
    return { error: 'Engel kaldırılamadı, tekrar dene.' };
  }
  return { ok: true };
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: temiz. (`createClient` import'u dosyada zaten var; yoksa mevcut import satırından doğrula — eklemeyip var olanı kullan.)

- [ ] **Step 3: Commit**

```bash
git add app/actions.ts
git commit -m "feat(f2): follow/unfollow/block/unblock server actions (session-authoritative, idempotent)"
```

---

### Task 4: Sunum bileşenleri (avatar, sosyal linkler, liste satırı)

**Files:**
- Create: `components/user/user-avatar.tsx`
- Create: `components/user/social-links.tsx`
- Create: `components/user/user-list-row.tsx`

**Interfaces:**
- Consumes: `avatarUrl` (`@/lib/storage/avatar`); `safeSocialUrl` + host sabitleri (Task 1); `PublicUserProfile`, `PublicUserSummary` (Task 2); `cn` (`@/lib/utils`).
- Produces: `UserAvatar`, `SocialLinks`, `UserListRow` React bileşenleri (server-safe; `'use client'` YOK).

- [ ] **Step 1: UserAvatar**

`components/user/user-avatar.tsx`:
```tsx
import { avatarUrl } from '@/lib/storage/avatar';
import { cn } from '@/lib/utils';

export function UserAvatar({
  username,
  profilePhoto,
  size = 40,
  className,
}: {
  username: string | null;
  profilePhoto: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (username ?? '?').charAt(0).toUpperCase();
  const dimension = { width: size, height: size };

  if (profilePhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image remotePatterns bilinçli olarak yapılandırılmadı (F0 kalıbı)
      <img
        src={avatarUrl(profilePhoto)}
        alt=""
        style={dimension}
        className={cn('rounded-full border border-border bg-secondary object-cover', className)}
      />
    );
  }
  return (
    <span
      style={dimension}
      className={cn(
        'flex items-center justify-center rounded-full border border-border bg-secondary font-semibold text-secondary-foreground',
        className,
      )}
    >
      {initial}
    </span>
  );
}
```

- [ ] **Step 2: SocialLinks**

`components/user/social-links.tsx`:
```tsx
import { Instagram, Facebook, Twitter, Music2, Send } from 'lucide-react';
import {
  safeSocialUrl,
  INSTAGRAM_HOSTS,
  TIKTOK_HOSTS,
  FACEBOOK_HOSTS,
  X_HOSTS,
  TELEGRAM_HOSTS,
} from '@/lib/social/safe-url';
import type { PublicUserProfile } from '@/lib/profile/types';

// Her link safeSocialUrl ile doğrulanır; null dönerse ikon HİÇ render edilmez.
export function SocialLinks({ profile }: { profile: PublicUserProfile }) {
  const links = [
    { url: safeSocialUrl(profile.instagram_url, INSTAGRAM_HOSTS), Icon: Instagram, label: 'Instagram' },
    { url: safeSocialUrl(profile.tiktok_url, TIKTOK_HOSTS), Icon: Music2, label: 'TikTok' },
    { url: safeSocialUrl(profile.facebook_url, FACEBOOK_HOSTS), Icon: Facebook, label: 'Facebook' },
    { url: safeSocialUrl(profile.x_url, X_HOSTS), Icon: Twitter, label: 'X' },
    { url: safeSocialUrl(profile.telegram_url, TELEGRAM_HOSTS), Icon: Send, label: 'Telegram' },
  ].filter((l): l is { url: string; Icon: typeof Instagram; label: string } => l.url !== null);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      {links.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: UserListRow**

`components/user/user-list-row.tsx`:
```tsx
import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import type { PublicUserSummary } from '@/lib/profile/types';

export function UserListRow({ user }: { user: PublicUserSummary }) {
  return (
    <Link
      href={`/profile/user/${user.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
    >
      <UserAvatar username={user.username} profilePhoto={user.profile_photo} size={40} />
      <span className="font-medium">{user.username ?? '-'}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: temiz. (lucide-react ikon adlarını doğrula: `Instagram`, `Facebook`, `Twitter`, `Music2`, `Send` — mevcut sürümde varlar. Biri yoksa yakın bir ikonla değiştir ve nedenini raporla.)

- [ ] **Step 5: Commit**

```bash
git add components/user/user-avatar.tsx components/user/social-links.tsx components/user/user-list-row.tsx
git commit -m "feat(f2): presentational user components (avatar, safe social links, list row)"
```

---

### Task 5: Etkileşimli aksiyon bileşenleri (follow/block, koordinasyon)

**Files:**
- Create: `components/user/follow-button.tsx`
- Create: `components/user/block-button.tsx`
- Create: `components/user/user-profile-actions.tsx`

**Interfaces:**
- Consumes: Task 3 action'ları; `Button` (`@/components/ui/button`); `useRouter`, `useState`, `useTransition` (client).
- Produces: `FollowButton`, `BlockButton`, `UserProfileActions` client bileşenleri.

- [ ] **Step 1: FollowButton**

`components/user/follow-button.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { followUserAction, unfollowUserAction } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function FollowButton({
  targetUserId,
  following,
  onChange,
}: {
  targetUserId: string;
  following: boolean;
  onChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !following;
    onChange?.(next); // optimistic; parent state'i günceller
    setError(null);
    startTransition(async () => {
      const result = next
        ? await followUserAction(targetUserId)
        : await unfollowUserAction(targetUserId);
      if ('error' in result) {
        onChange?.(!next); // geri al
        setError(result.error);
        return;
      }
      router.refresh(); // sayaçları tazele
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant={following ? 'outline' : 'default'}
        disabled={pending}
        onClick={toggle}
        className="w-full"
      >
        {following ? 'Takibi bırak' : 'Takip et'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: BlockButton**

`components/user/block-button.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { blockUserAction, unblockUserActionById } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function BlockButton({
  targetUserId,
  blocked,
  onChange,
}: {
  targetUserId: string;
  blocked: boolean;
  onChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !blocked;
    onChange?.(next);
    setError(null);
    startTransition(async () => {
      const result = next
        ? await blockUserAction(targetUserId)
        : await unblockUserActionById(targetUserId);
      if ('error' in result) {
        onChange?.(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={toggle}
        className="w-full"
      >
        {blocked ? 'Engeli kaldır' : 'Engelle'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: UserProfileActions (koordinasyon)**

`components/user/user-profile-actions.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { FollowButton } from './follow-button';
import { BlockButton } from './block-button';

// Public profildeki aksiyon satırı. Mobil UserFollowOrBlockWidget'in Message'sız
// (Chats=Faz 7) / trust'sız (Faz 9) sadeleştirilmiş hali. Engellendiğinde takip
// butonu gizlenir — iki buton state'i burada koordine edilir.
export function UserProfileActions({
  targetUserId,
  initialFollowing,
  initialBlocked,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);

  return (
    <div className="flex items-start justify-center gap-3">
      {!blocked && (
        <FollowButton targetUserId={targetUserId} following={following} onChange={setFollowing} />
      )}
      <BlockButton targetUserId={targetUserId} blocked={blocked} onChange={setBlocked} />
    </div>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: temiz. (`Button` variant adlarını doğrula: `default`, `outline` shadcn'de mevcut.)

- [ ] **Step 5: Commit**

```bash
git add components/user/follow-button.tsx components/user/block-button.tsx components/user/user-profile-actions.tsx
git commit -m "feat(f2): optimistic follow/block buttons + action coordinator"
```

---

### Task 6: ProfileHeader + gerçek kendi-profil sayfası

**Files:**
- Create: `components/user/profile-header.tsx`
- Modify: `app/(app)/profile/page.tsx` (placeholder'ı değiştir)

**Interfaces:**
- Consumes: `UserAvatar`, `SocialLinks` (Task 4); `PublicUserProfile`/`FollowCounts` (Task 2); `getCurrentUserProfile` (`@/lib/profile/server`); `getFollowCounts` (Task 2); `Link` (next).
- Produces: `ProfileHeader` bileşeni.

- [ ] **Step 1: ProfileHeader**

`components/user/profile-header.tsx`:
```tsx
import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import { SocialLinks } from './social-links';
import type { PublicUserProfile, FollowCounts } from '@/lib/profile/types';

function StatCell({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <span className="flex flex-col items-center">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="rounded-md px-3 py-1 transition-colors hover:bg-accent">
      {inner}
    </Link>
  ) : (
    <span className="px-3 py-1">{inner}</span>
  );
}

export function ProfileHeader({
  profile,
  counts,
  countsHref,
  actions,
}: {
  profile: PublicUserProfile;
  counts: FollowCounts;
  countsHref?: { followers: string; following: string } | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <UserAvatar username={profile.username} profilePhoto={profile.profile_photo} size={112} />
      <h1 className="text-xl font-bold">{profile.username ?? '-'}</h1>

      <div className="flex items-center gap-4">
        <StatCell value={counts.following} label="Takip" href={countsHref?.following} />
        <StatCell value={counts.followers} label="Takipçi" href={countsHref?.followers} />
      </div>

      <SocialLinks profile={profile} />

      {profile.bio && (
        <p className="max-w-md text-center text-sm text-muted-foreground">{profile.bio}</p>
      )}

      {actions}
    </div>
  );
}
```

- [ ] **Step 2: Kendi-profil sayfasını değiştir**

`app/(app)/profile/page.tsx` (tamamen değiştir):
```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Settings, Pencil } from 'lucide-react';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { getFollowCounts } from '@/lib/follow/server';
import { ProfileHeader } from '@/components/user/profile-header';
import { Button } from '@/components/ui/button';

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  const counts = await getFollowCounts(profile.id);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProfileHeader
        profile={profile}
        counts={counts}
        countsHref={{ followers: '/profile/followers', following: '/profile/followings' }}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/profile/edit">
                <Pencil className="mr-1.5 h-4 w-4" />
                Düzenle
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile/settings">
                <Settings className="mr-1.5 h-4 w-4" />
                Ayarlar
              </Link>
            </Button>
          </div>
        }
      />
      {/* İçerik sekmeleri (ilanlar, sahiplendirmeler) ve kaydettiklerin ilgili
          domain fazlarında (Faz 3/6) eklenecek — bkz. F2 spec §2 deferral. */}
      <p className="pb-6 text-center text-sm text-muted-foreground">
        İlanların ve kaydettiklerin yakında.
      </p>
    </div>
  );
}
```
Not: `getCurrentUserProfile` dönüşü `CurrentUserProfile` (= `ProfileRow & PII`); `ProfileHeader` `PublicUserProfile` (Pick alt kümesi) bekler — `CurrentUserProfile` structurally uyumludur (gerekli tüm public alanları içerir), doğrudan geçer.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: temiz. (`Button asChild` shadcn'de destekli.)

- [ ] **Step 4: Commit**

```bash
git add components/user/profile-header.tsx "app/(app)/profile/page.tsx"
git commit -m "feat(f2): shared ProfileHeader + real own-profile page (replaces placeholder)"
```

---

### Task 7: Public profil sayfası

**Files:**
- Create: `app/(app)/profile/user/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPublicProfile` (Task 2), `getFollowCounts`/`isFollowing`/`isBlocked` (Task 2), `ProfileHeader` (Task 6), `UserProfileActions` (Task 5), `getCurrentUserProfile` (`@/lib/profile/server`).

- [ ] **Step 1: Public profil sayfası**

`app/(app)/profile/user/[id]/page.tsx`:
```tsx
import { redirect, notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { getPublicProfile } from '@/lib/profile/public';
import { getFollowCounts, isFollowing, isBlocked } from '@/lib/follow/server';
import { ProfileHeader } from '@/components/user/profile-header';
import { UserProfileActions } from '@/components/user/user-profile-actions';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');
  // Tek doğru kendi-profil yüzeyi /profile; self URL oraya yönlenir.
  if (id === me.id) redirect('/profile');

  const profile = await getPublicProfile(id);
  if (!profile) notFound();

  const [counts, following, blocked] = await Promise.all([
    getFollowCounts(id),
    isFollowing(me.id, id),
    isBlocked(me.id, id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProfileHeader
        profile={profile}
        counts={counts}
        countsHref={null}
        actions={
          <UserProfileActions
            targetUserId={id}
            initialFollowing={following}
            initialBlocked={blocked}
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: temiz. (Next 15 dinamik segment `params` `Promise` — `await params` doğru; `notFound()`/`redirect()` `noImplicitReturns` ile uyumlu, ikisi de `never` döner.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/profile/user/[id]/page.tsx"
git commit -m "feat(f2): public user profile page (/profile/user/[id]) with follow/block actions"
```

---

### Task 8: Takipçi/takip listesi sayfaları

**Files:**
- Create: `app/(app)/profile/followers/page.tsx`
- Create: `app/(app)/profile/followings/page.tsx`

**Interfaces:**
- Consumes: `listFollowers`/`listFollowing` (Task 2), `UserListRow` (Task 4), `getCurrentUserProfile`.

- [ ] **Step 1: Followers sayfası**

`app/(app)/profile/followers/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { listFollowers } from '@/lib/follow/server';
import { UserListRow } from '@/components/user/user-list-row';

export default async function FollowersPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const followers = await listFollowers(me.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-2 px-2 text-xl font-bold">Takipçiler</h1>
      {followers.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          Henüz takipçin yok.
        </p>
      ) : (
        <div className="flex flex-col">
          {followers.map((u) => (
            <UserListRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Followings sayfası**

`app/(app)/profile/followings/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { listFollowing } from '@/lib/follow/server';
import { UserListRow } from '@/components/user/user-list-row';

export default async function FollowingsPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const following = await listFollowing(me.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-2 px-2 text-xl font-bold">Takip edilenler</h1>
      {following.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          Henüz kimseyi takip etmiyorsun.
        </p>
      ) : (
        <div className="flex flex-col">
          {following.map((u) => (
            <UserListRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: temiz.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/followers/page.tsx" "app/(app)/profile/followings/page.tsx"
git commit -m "feat(f2): own followers/followings list pages"
```

- [ ] **Step 5: Faz sonu çalışma-zamanı doğrulaması (Chrome MCP smoke)**

`npm run dev` + Chrome MCP ile (mümkünse iki test kullanıcısı):
- `/profile` kendi başlık + doğru sayaçlar; sayaçlar `/profile/followers` ve `/profile/followings`'e gider.
- `/profile/user/[B]` B'nin public profili; PII görünmez; "Takip et" → "Takibi bırak"; yenile → kalıcı.
- "Engelle" → takip butonu kaybolur, "Engeli kaldır" görünür; kaldır → takip butonu döner.
- `/profile/user/[kendi-id]` → `/profile`'a yönlenir; geçersiz id → 404.
- Geçersiz/foreign-host sosyal link render edilmez.
- pkill dev server.

(Test kullanıcısı yoksa: build + tek-kullanıcı görünüm doğrulaması + self-redirect/404, ve "iki-kullanıcı akışı doğrulanamadı, çünkü ikinci hesap yok" olarak raporla — sessizce atlanmaz.)

---

## Self-Review (yazım sonrası)

**Spec coverage:** F2 spec §8 kriterleri → Task eşleme:
1 (kendi profil+sayaç) → T6; 2 (public profil, PII yok) → T2+T7; 3 (follow) → T3+T5+T7; 4 (block) → T3+T5+T7; 5 (self-redirect/404) → T7; 6 (listeler) → T2+T4+T8; 7 (güvenli sosyal link) → T1+T4; 8 (self/çift reddi) → T3; 9 (build temiz) → her task; 10 (deferral fail-loud) → T6 not + spec §2. Boşluk yok.

**Placeholder scan:** Tüm adımlar gerçek kod içerir; TBD/TODO yok.

**Type consistency:** `PublicUserProfile`/`PublicUserSummary`/`FollowCounts` T2'de tanımlı, T4/T6/T7/T8'de aynı adla tüketiliyor. Action dönüş tipi `{ ok: true } | { error: string }` T3'te tanımlı, T5'te `'error' in result` ile yorumlanıyor. `getCurrentUserProfile` → `CurrentUserProfile` structurally `PublicUserProfile`'ı karşılar (T6 notu).
