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
