'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createChatRepository } from '@/lib/chats/repository';
import { startDirectChat } from '@/lib/chats/dm';
import { loginWallHref } from '@/lib/auth/next-path';

// Generic "start a DM" CTA reused across emergency/adoptions/lost-found/profile
// surfaces. Self-hides when the target is the viewer — startDirectChat's
// findOrCreateDirectRoom rejects self-DM anyway, but callers shouldn't have to
// duplicate that guard at every call site.
export function MessageUserButton({
  targetUserId,
  currentUserId,
  label = 'Mesaj',
}: {
  targetUserId: string;
  currentUserId: string | null;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(false);

  if (targetUserId === currentUserId) return null;

  if (currentUserId == null) {
    return (
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={loginWallHref(pathname)}>
          <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
          {label}
        </Link>
      </Button>
    );
  }

  // Re-bind to a variable the closure below can see as narrowed `string` —
  // TS doesn't carry the `!= null` narrowing of a parameter into a nested
  // function declaration.
  const viewerId = currentUserId;

  function handleClick() {
    setBlocked(false);
    setError(false);
    startTransition(async () => {
      try {
        const repo = createChatRepository(viewerId);
        const res = await startDirectChat(repo, targetUserId);
        if ('blocked' in res) {
          setBlocked(true);
          return;
        }
        router.push('/chats/' + res.roomId);
      } catch (e) {
        // A non-23505 failure (transient network/RLS) must not silently
        // re-enable the button with no feedback — mirror follow/block-button.
        console.error('MessageUserButton:', e);
        setError(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
        <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
        {label}
      </Button>
      {blocked && (
        <p className="text-xs text-muted-foreground">Bu kullanıcı yeni mesajlara kapalı.</p>
      )}
      {error && <p className="text-xs text-destructive">Sohbet başlatılamadı, tekrar dene.</p>}
    </div>
  );
}
