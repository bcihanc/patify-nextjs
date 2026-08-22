'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { setFlag } from '@/lib/admin/ops-actions';
import type { AdminFlag } from '@/lib/admin/ops';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FlagRow({ flag }: { flag: AdminFlag }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Checkbox
          id={`flag-${flag.key}`}
          checked={flag.enabled}
          disabled={pending}
          onCheckedChange={(v) => startTransition(async () => {
            const result = await setFlag(flag.key, v === true);
            if ('error' in result) toast.error(result.error);
            else toast.success('Flag güncellendi.');
          })}
        />
        <Label htmlFor={`flag-${flag.key}`} className="font-mono text-sm">{flag.key}</Label>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(flag.updatedAt)}</span>
    </div>
  );
}
