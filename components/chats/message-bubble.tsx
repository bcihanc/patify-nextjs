'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage, ChatMessageStatus } from '@/lib/chats/types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Same relative-time buckets as room-row.tsx/notification-tile.tsx over an
// epoch-ms number — kept as a local twin per the existing convention (each
// call site carries its own small copy) rather than a shared util.
function relativeTimeFromMs(ms: number): string {
  const diffMs = Date.now() - ms;

  if (diffMs < MINUTE_MS) return 'az önce';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} dk önce`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} sa önce`;
  if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)} gün önce`;

  return new Date(ms).toLocaleDateString('tr-TR');
}

// Only rendered for MINE messages. 'sending' has no hint yet (in flight);
// 'sent'/'seen' get a WhatsApp-style check mark, seen additionally spelled
// out in Turkish since a bare "✓✓" reads ambiguous on its own.
function statusHint(status: ChatMessageStatus): string | null {
  if (status === 'seen') return '✓✓ Görüldü';
  if (status === 'sent') return '✓';
  return null;
}

export function MessageBubble({ m, isMine }: { m: ChatMessage; isMine: boolean }) {
  const hint = isMine ? statusHint(m.status) : null;

  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
          isMine
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
          m.status === 'sending' && 'opacity-60'
        )}
      >
        {m.type === 'text' ? (
          <p className="whitespace-pre-line break-words">{m.text}</p>
        ) : (
          // Task 6: image rendering via signedUrlForMessage — placeholder for now.
          <p className="italic">📷 Fotoğraf</p>
        )}

        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isMine ? 'justify-end text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          <span>{relativeTimeFromMs(m.createdAt)}</span>
          {hint && <span>{hint}</span>}
        </div>
      </div>
    </div>
  );
}
