'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AdoptionCard } from '@/components/adoptions/adoption-card';
import { Button } from '@/components/ui/button';
import { loadBrowseAdoptionsAction } from '@/lib/adoptions/actions';
import { EMPTY_ADOPTION_FILTERS, PER_PAGE } from '@/lib/adoptions/types';
import type { AdoptionListing } from '@/lib/adoptions/types';

// `ownerId` is accepted (and threaded through by page.tsx) now so the prop
// shape is stable, but isn't used until Task 5 wires filter persistence /
// owner-stamping (F3's browse-list pattern). Filters are EMPTY here on
// purpose — filter wiring is Task 5.
export function BrowseList({
  initial,
}: {
  initial: AdoptionListing[];
  ownerId: string | null;
}) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1); // initial already covers page 0
  const [hasMore, setHasMore] = useState(initial.length >= PER_PAGE);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await loadBrowseAdoptionsAction(EMPTY_ADOPTION_FILTERS, page);
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      if (next.length < PER_PAGE) setHasMore(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Sonuç bulunamadı.</p>
          <Button asChild>
            <Link href="/adoptions/create">İlan ver</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((listing) => (
            <AdoptionCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {hasMore && items.length > 0 && (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={isPending}
          className="self-center"
        >
          {isPending ? 'Yükleniyor…' : 'Daha fazla yükle'}
        </Button>
      )}
    </div>
  );
}
