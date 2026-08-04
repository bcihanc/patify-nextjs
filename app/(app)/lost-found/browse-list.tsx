'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { LfFilterBar } from '@/components/lost-found/lf-filter-bar';
import { LfListingCard } from '@/components/lost-found/lf-listing-card';
import { Button } from '@/components/ui/button';
import { loadBrowseAction, loadNearbyAction } from '@/lib/lost-found/actions';
import {
  hasActiveFilters,
  loadFilterSnapshot,
  saveFilterSnapshot,
  withRadius,
} from '@/lib/lost-found/filters';
import { EMPTY_LF_FILTERS, PER_PAGE } from '@/lib/lost-found/types';
import type { LfFilters, LostFoundListing } from '@/lib/lost-found/types';

type GeoCoords = { lat: number; long: number };

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
    });
  });
}

// Server can't read localStorage, so `initial` is always the unfiltered SSR
// first page; persisted filters (if any) are hydrated and refetched here on
// mount (Task 6 brief).
export function BrowseList({
  initial,
  ownerId,
}: {
  initial: LostFoundListing[];
  ownerId: string | null;
}) {
  const [filters, setFilters] = useState<LfFilters>(EMPTY_LF_FILTERS);
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1); // initial already covers page 0
  const [hasMore, setHasMore] = useState(initial.length >= PER_PAGE);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(null);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydratedRef = useRef(false);

  // Fetches page 0 for `next`. When radius is set, requires browser
  // geolocation; if that's denied/unavailable, clears the radius, persists
  // the correction, tells the user, and falls back to a plain browse.
  async function fetchFirstPage(next: LfFilters) {
    setGeoNotice(null);

    if (next.radiusKm == null) {
      setGeoCoords(null);
      const result = await loadBrowseAction(next, 0);
      setItems(result);
      setPage(1);
      setHasMore(result.length >= PER_PAGE);
      return;
    }

    try {
      const position = await getCurrentPosition();
      const coords: GeoCoords = { lat: position.coords.latitude, long: position.coords.longitude };
      setGeoCoords(coords);
      const result = await loadNearbyAction(coords.lat, coords.long, next, 0);
      setItems(result);
      setPage(1);
      setHasMore(result.length >= PER_PAGE);
    } catch {
      const fallback = withRadius(next, null);
      setFilters(fallback);
      saveFilterSnapshot(ownerId, fallback);
      setGeoCoords(null);
      setGeoNotice('Konumuna erişilemedi, yarıçap filtresi kaldırıldı — sonuçlar şehir/ilçeye göre gösteriliyor.');
      const result = await loadBrowseAction(fallback, 0);
      setItems(result);
      setPage(1);
      setHasMore(result.length >= PER_PAGE);
    }
  }

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const snapshot = loadFilterSnapshot(ownerId);
    if (!hasActiveFilters(snapshot)) return;
    setFilters(snapshot);
    startTransition(async () => {
      await fetchFirstPage(snapshot);
    });
    // Mount-only hydration — deliberately does not re-run on ownerId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiltersChange(next: LfFilters) {
    setFilters(next);
    saveFilterSnapshot(ownerId, next);
    startTransition(async () => {
      await fetchFirstPage(next);
    });
  }

  function loadMore() {
    startTransition(async () => {
      const next =
        filters.radiusKm != null && geoCoords
          ? await loadNearbyAction(geoCoords.lat, geoCoords.long, filters, page)
          : await loadBrowseAction(filters, page);
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      if (next.length < PER_PAGE) setHasMore(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <LfFilterBar filters={filters} onChange={handleFiltersChange} />
      {geoNotice && <p className="text-sm text-muted-foreground">{geoNotice}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Sonuç bulunamadı.</p>
          {hasActiveFilters(filters) ? (
            <Button variant="outline" onClick={() => handleFiltersChange(EMPTY_LF_FILTERS)}>
              Filtreleri temizle
            </Button>
          ) : (
            <Button asChild>
              <Link href="/lost-found/create">İlan ver</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((listing) => (
            <LfListingCard key={listing.id} listing={listing} />
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
