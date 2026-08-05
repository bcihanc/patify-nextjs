'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createChatRepository } from '@/lib/chats/repository';
import { startDirectChat } from '@/lib/chats/dm';

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
  currentUserId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState(false);

  if (targetUserId === currentUserId) return null;

  function handleClick() {
    setBlocked(false);
    startTransition(async () => {
      const repo = createChatRepository(currentUserId);
      const res = await startDirectChat(repo, targetUserId);
      if ('blocked' in res) {
        setBlocked(true);
        return;
      }
      router.push('/chats/' + res.roomId);
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
    </div>
  );
}
