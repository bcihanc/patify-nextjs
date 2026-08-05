'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { setAcceptsDmsAction } from '@/lib/profile/dm-prefs';

// Optimistic toggle over setAcceptsDmsAction (mirrors analytics-consent-toggle.tsx's
// pattern; unlike that one this goes through a server action, not a client-side
// RPC, since accepts_dms is a plain upsert rather than a SECURITY DEFINER RPC).
// A failure reverts the checkbox and surfaces an inline error.
export function AcceptDmsToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setPending(true);
    setError(null);

    const result = await setAcceptsDmsAction(next);
    setPending(false);

    if ('error' in result) {
      setEnabled(!next); // revert
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <Checkbox
          id="accept-dms"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(checked) => handleChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="accept-dms" className="font-normal leading-snug">
          <span className="block font-medium text-foreground">Mesajlara izin ver</span>
          <span className="block text-muted-foreground">
            Kapalıyken kimse seninle yeni sohbet başlatamaz.
          </span>
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
