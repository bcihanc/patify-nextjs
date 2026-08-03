import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { resolveGateRedirect } from '@/lib/auth/gate';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

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

  // Temporary shim: AppShell (responsive nav chrome) lands in Task 7.
  return <>{children}</>;
}
