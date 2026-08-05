'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { messagePreview, type ChatRoom } from '@/lib/chats/types';
import type { PublicUserSummary } from '@/lib/profile/types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Same buckets as notification-tile.tsx's relativeTime, but over an
// epoch-ms number (room.updatedAt) instead of an ISO string — the two
// inputs don't share a parseable shape, so this stays a small local twin
// rather than a shared util for a single call site apiece.
function relativeTimeFromMs(ms: number): string {
  const diffMs = Date.now() - ms;

  if (diffMs < MINUTE_MS) return 'az önce';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} dk önce`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} sa önce`;
  if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)} gün önce`;

  return new Date(ms).toLocaleDateString('tr-TR');
}

export function RoomRow({
  room,
  otherUser,
  unreadCount,
  onDelete,
}: {
  room: ChatRoom;
  otherUser: PublicUserSummary | null;
  unreadCount: number;
  onDelete: (roomId: string) => void;
}) {
  const username = otherUser?.username ?? 'Kullanıcı';
  const preview =
    room.lastMessage === null
      ? 'Sohbet başladı'
      : (messagePreview(room.lastMessage) ?? '📷 Fotoğraf');
  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  function handleDelete() {
    if (window.confirm('Bu sohbet silinsin mi?')) {
      onDelete(room.id);
    }
  }

  // Delete button is a SIBLING of the Link, not a child — a <button> nested
  // inside an <a> is invalid interactive nesting (axe "nested-interactive").
  // The Link reserves right padding (pr-11) for the absolutely-positioned
  // delete button.
  return (
    <div className="relative rounded-md transition-colors hover:bg-accent">
      <Link
        href={`/chats/${room.id}`}
        className="flex items-center gap-3 px-2 py-3 pr-11"
      >
        <UserAvatar username={username} profilePhoto={otherUser?.profile_photo ?? null} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{username}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {relativeTimeFromMs(room.updatedAt)}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{preview}</p>
        </div>

        {badge && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground">
            {badge}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        aria-label="Sohbeti sil"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
