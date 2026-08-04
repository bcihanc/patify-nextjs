'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { blockUserAction, unblockUserActionById } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function BlockButton({
  targetUserId,
  blocked,
  onChange,
}: {
  targetUserId: string;
  blocked: boolean;
  onChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !blocked;
    onChange?.(next);
    setError(null);
    startTransition(async () => {
      const result = next
        ? await blockUserAction(targetUserId)
        : await unblockUserActionById(targetUserId);
      if ('error' in result) {
        onChange?.(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={toggle}
        className="w-full"
      >
        {blocked ? 'Engeli kaldır' : 'Engelle'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
