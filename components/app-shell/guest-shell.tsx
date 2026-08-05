'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { loginWallHref } from '@/lib/auth/next-path';
import { NAV_ITEMS } from './nav-items';
import { SiteFooter } from './site-footer';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link href="/lost-found" className="text-lg font-bold text-primary">
          Patify
        </Link>
      </header>

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
                href={item.requiresLogin ? loginWallHref(item.href) : item.href}
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
        <div className="flex items-center gap-4">
          <Link
            href={loginWallHref('/profile')}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Giriş yap
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 md:pb-6">
        {children}
        <SiteFooter />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.requiresLogin ? loginWallHref(item.href) : item.href}
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
