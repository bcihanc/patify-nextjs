'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { AdoptionFilterBar } from '@/components/adoptions/adoption-filter-bar';
import { AdoptionCard } from '@/components/adoptions/adoption-card';
import { Button } from '@/components/ui/button';
import { loadBrowseAdoptionsAction, loadNearbyAdoptionsAction } from '@/lib/adoptions/actions';
import {
  hasActiveFilters,
  loadFilterSnapshot,
  saveFilterSnapshot,
  withRadius,
} from '@/lib/adoptions/filters';
import { EMPTY_ADOPTION_FILTERS, PER_PAGE } from '@/lib/adoptions/types';
import type { AdoptionFilters, AdoptionListing } from '@/lib/adoptions/types';

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
// mount (Task 5 brief, mirrors F3's browse-list).
export function BrowseList({
  initial,
  ownerId,
}: {
  initial: AdoptionListing[];
  ownerId: string | null;
}) {
  const [filters, setFilters] = useState<AdoptionFilters>(EMPTY_ADOPTION_FILTERS);
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
  async function fetchFirstPage(next: AdoptionFilters) {
    setGeoNotice(null);

    if (next.radiusKm == null) {
      setGeoCoords(null);
      const result = await loadBrowseAdoptionsAction(next, 0);
      setItems(result);
      setPage(1);
      setHasMore(result.length >= PER_PAGE);
      return;
    }

    try {
      const position = await getCurrentPosition();
      const coords: GeoCoords = { lat: position.coords.latitude, long: position.coords.longitude };
      setGeoCoords(coords);
      const result = await loadNearbyAdoptionsAction(coords.lat, coords.long, next, 0);
      setItems(result);
      setPage(1);
      setHasMore(result.length >= PER_PAGE);
    } catch {
      const fallback = withRadius(next, null);
      setFilters(fallback);
      saveFilterSnapshot(ownerId, fallback);
      setGeoCoords(null);
      setGeoNotice('Konumuna erişilemedi, yarıçap filtresi kaldırıldı — sonuçlar şehir/ilçeye göre gösteriliyor.');
      const result = await loadBrowseAdoptionsAction(fallback, 0);
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

  function handleFiltersChange(next: AdoptionFilters) {
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
          ? await loadNearbyAdoptionsAction(geoCoords.lat, geoCoords.long, filters, page)
          : await loadBrowseAdoptionsAction(filters, page);
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      if (next.length < PER_PAGE) setHasMore(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdoptionFilterBar filters={filters} onChange={handleFiltersChange} />
      {geoNotice && <p className="text-sm text-muted-foreground">{geoNotice}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Sonuç bulunamadı.</p>
          {hasActiveFilters(filters) ? (
            <Button variant="outline" onClick={() => handleFiltersChange(EMPTY_ADOPTION_FILTERS)}>
              Filtreleri temizle
            </Button>
          ) : (
            <Button asChild>
              <Link href="/adoptions/create">İlan ver</Link>
            </Button>
          )}
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
