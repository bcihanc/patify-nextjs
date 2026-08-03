'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CurrentUserProfile } from '@/lib/profile/types';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  profile,
  children,
}: {
  profile: CurrentUserProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = (profile.username ?? '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-border bg-background px-6 md:flex">
        <Link href="/lost-found" className="text-lg font-bold text-primary">
          Patify
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-2 text-sm font-medium transition-colors',
            isActive(pathname, '/profile')
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
            {initial}
          </span>
          <span className="hidden lg:inline">{profile.username ?? 'Profil'}</span>
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 md:pb-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
