'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from './notifications-provider';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Link
      href="/notifications"
      aria-label="Bildirimler"
      className="relative flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {badge && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
