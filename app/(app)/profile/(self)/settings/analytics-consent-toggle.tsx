'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

// Optimistic toggle over the `set_analytics_consent` RPC (mirrors mobile's
// AnalyticsRepo.setConsent — a plain client-side RPC call, no server action
// needed since the RPC is SECURITY DEFINER and scopes to auth.uid() itself).
// A failure reverts the checkbox and surfaces an inline error.
export function AnalyticsConsentToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('set_analytics_consent', { enabled: next });
    setPending(false);

    if (rpcError) {
      setEnabled(!next); // revert
      setError('Kaydedilemedi, tekrar dene.');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <Checkbox
          id="analytics-consent"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(checked) => handleChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="analytics-consent" className="font-normal leading-snug">
          Uygulama kullanım istatistiklerimin toplanmasına izin veriyorum.
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
