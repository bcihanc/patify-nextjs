'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { followUserAction, unfollowUserAction } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function FollowButton({
  targetUserId,
  following,
  onChange,
}: {
  targetUserId: string;
  following: boolean;
  onChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !following;
    onChange?.(next); // optimistic; parent state'i günceller
    setError(null);
    startTransition(async () => {
      const result = next
        ? await followUserAction(targetUserId)
        : await unfollowUserAction(targetUserId);
      if ('error' in result) {
        onChange?.(!next); // geri al
        setError(result.error);
        return;
      }
      router.refresh(); // sayaçları tazele
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant={following ? 'outline' : 'default'}
        disabled={pending}
        onClick={toggle}
        className="w-full"
      >
        {following ? 'Takibi bırak' : 'Takip et'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
