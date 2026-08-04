'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportDataAction } from '@/app/actions';
import { Button } from '@/components/ui/button';

// Calls exportDataAction and turns the returned JSON into a same-origin
// Blob download — no server-hosted file, so nothing lingers once the tab
// closes. Mirrors mobile's export flow (share sheet over a temp file),
// adapted to the browser's download affordance.
export function ExportDataButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const result = await exportDataAction();
    setPending(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patify-verilerim.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={handleClick}>
        <Download className="h-4 w-4" />
        {pending ? 'Hazırlanıyor...' : 'Verilerimi indir'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
