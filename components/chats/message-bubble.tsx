'use client';

import { useEffect, useState } from 'react';
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

export function MessageBubble({
  m,
  isMine,
  signImageUrl,
}: {
  m: ChatMessage;
  isMine: boolean;
  // Bubble has no repo of its own — chat-room owns the ChatRepository (it
  // needs currentUserId) and hands down just this one bound method, so the
  // trusted-host guard in signedUrlForMessage stays the single place that
  // decides whether a uri is displayable.
  signImageUrl?: (uri: string) => Promise<string | null>;
}) {
  const hint = isMine ? statusHint(m.status) : null;
  const imageUri = m.type === 'image' ? m.uri : null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // Distinguishes "still resolving" (imageUrl === null, imageFailed === false)
  // from "resolved to untrusted/failed" (imageUrl === null, imageFailed ===
  // true) so the placeholder text matches reality instead of always reading
  // "loading".
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    setImageFailed(false);

    // A malformed image row with an empty uri can never resolve — show the
    // "unavailable" placeholder instead of a forever "loading" state.
    if (!imageUri) {
      setImageFailed(true);
      return;
    }

    if (!signImageUrl) {
      setImageFailed(true);
      return;
    }

    void signImageUrl(imageUri).then((url) => {
      if (cancelled) return;
      if (url) setImageUrl(url);
      else setImageFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [imageUri, signImageUrl]);

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
        ) : imageUrl ? (
          // Never render the raw m.uri here — it's attacker-controllable and
          // only signedUrlForMessage's trusted-host check clears a value for
          // display (see repository.ts).
          <img
            src={imageUrl}
            alt={m.name ?? 'Fotoğraf'}
            className="max-w-full rounded-lg"
          />
        ) : imageFailed ? (
          <p className="italic text-muted-foreground">📷 Görsel gösterilemiyor</p>
        ) : (
          <p className="italic">📷 Yükleniyor…</p>
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
