'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'adoption_sales_ban_shown';
const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export function SalesBanBanner() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if within 30-day cooldown
    const storedTimestamp = localStorage.getItem(STORAGE_KEY);
    if (storedTimestamp) {
      const lastShown = new Date(storedTimestamp).getTime();
      const now = Date.now();
      if (now - lastShown < COOLDOWN_MS) {
        // Within cooldown, don't show
        setShow(false);
        return;
      }
    }

    // Not within cooldown, show the banner
    setShow(true);
  }, []);

  if (!mounted || !show) {
    return null;
  }

  function handleDismiss() {
    // Set the timestamp to now and hide the banner
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setShow(false);
  }

  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted p-4">
      <div className="flex flex-col gap-2 flex-1">
        <p className="text-sm text-foreground">
          Patify'da evcil hayvanların ücretli satışı veya takası yasaktır. İlanlar yalnızca ücretsiz
          sahiplendirme içindir.
        </p>
        <div>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/tos">Detaylar</Link>
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-fit shrink-0"
        onClick={handleDismiss}
        aria-label="Kapat"
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
