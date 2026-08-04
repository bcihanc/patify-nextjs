'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { LfListingCard } from '@/components/lost-found/lf-listing-card';
import { Button } from '@/components/ui/button';
import { loadMoreBrowseAction } from '@/lib/lost-found/actions';
import { PER_PAGE, type LostFoundListing } from '@/lib/lost-found/types';

export function BrowseList({ initial }: { initial: LostFoundListing[] }) {
  const [items, setItems] = useState(initial);
  // initial is page 0 → next fetch is page 1.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial.length >= PER_PAGE);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const next = await loadMoreBrowseAction(page);
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      if (next.length < PER_PAGE) setHasMore(false);
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">Sonuç bulunamadı.</p>
        <Button asChild>
          <Link href="/lost-found/create">İlan ver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {items.map((listing) => (
          <LfListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      {hasMore && (
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
