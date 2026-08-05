'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { useNotifications } from './notifications-provider';
import { notificationIcon } from '@/lib/notifications/copy';
import {
  AppNotification,
  notificationActorPhoto,
  notificationActorUsername,
} from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();

  if (diffMs < MINUTE_MS) return 'az önce';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} dk önce`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} sa önce`;
  if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)} gün önce`;

  return new Date(iso).toLocaleDateString('tr-TR');
}

export function NotificationTile({ n }: { n: AppNotification }) {
  const router = useRouter();
  const { markRead, remove } = useNotifications();

  const actorUsername = notificationActorUsername(n);
  const actorPhoto = notificationActorPhoto(n);
  const hasActor = actorUsername !== null || actorPhoto !== null;
  const Icon = notificationIcon(n.type);

  function handleClick() {
    void markRead([n.id]);
    // Internal-only navigation — never follow an external/javascript: url.
    if (n.url && n.url.startsWith('/')) {
      router.push(n.url);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    void remove([n.id]);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'relative flex cursor-pointer items-start gap-3 rounded-md py-3 pl-4 pr-2 text-left transition-colors hover:bg-accent',
        !n.isRead && 'bg-accent/40'
      )}
    >
      {!n.isRead && (
        <span
          aria-hidden
          className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"
        />
      )}

      {hasActor ? (
        <UserAvatar username={actorUsername} profilePhoto={actorPhoto} size={40} />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {n.title && <p className="font-medium">{n.title}</p>}
        {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime(n.createdAt)}</p>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        aria-label="Bildirimi sil"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
