import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { resolveGateRedirect } from '@/lib/auth/gate';
import { fetchNotifications } from '@/lib/notifications/read';
import { AppShell } from '@/components/app-shell/app-nav';
import { GuestShell } from '@/components/app-shell/guest-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return <GuestShell>{children}</GuestShell>;
  }

  // Set by middleware (lib/supabase/middleware.ts) as a REQUEST header, since
  // Next.js 15 server components cannot read the pathname natively.
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

  // Gate pages are focused, back-blocked flows (spec §4.2/§4.3) — they
  // render without the AppShell nav.
  if (pathname === '/complete-profile' || pathname === '/accept-consent') {
    return <>{children}</>;
  }

  const initialNotifications = await fetchNotifications();

  return (
    <AppShell
      username={profile.username}
      userId={profile.id}
      initialNotifications={initialNotifications}
    >
      {children}
    </AppShell>
  );
}
