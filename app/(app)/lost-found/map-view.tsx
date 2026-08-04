'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { LocateFixed, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleMapsProvider } from '@/lib/maps/maps-provider';
import { mapInBoundsAction } from '@/lib/lost-found/actions';
import type { LostFoundListing } from '@/lib/lost-found/types';
import type { MapBounds } from '@/lib/lost-found/read';

// Türkiye/İstanbul merkezli makul varsayılan — page.tsx bu bileşeni yalnızca
// hasMapsKey() true iken render eder (graceful degrade orada).
const DEFAULT_CENTER = { lat: 41.0082, lng: 28.9784 };
const DEFAULT_ZOOM = 11;

// Haritada yalnızca bu iki durum gösterilir (cozuldu server-side dışlanır,
// pasif owner-only ve bu public bbox sorgusunda hiç dönmez — bkz. lib/lost-found/read.ts).
type MapStatus = 'kayip' | 'bulundu';

function isMapStatus(status: LostFoundListing['status']): status is MapStatus {
  return status === 'kayip' || status === 'bulundu';
}

// F0 spec renk kararı: kayip=primary (sıcak kırmızı/terracotta), bulundu=success
// (yeşil) — lf-status-badge.tsx'teki aynı token'ların hex karşılığı (Pin
// bileşeni Tailwind class değil düz renk string'i alıyor).
const MARKER_COLOR: Record<MapStatus, { background: string; border: string }> = {
  kayip: { background: '#be4e2b', border: '#7a2f18' },
  bulundu: { background: '#22c55e', border: '#15803d' },
};

function boundsFromEvent(ev: MapCameraChangedEvent): MapBounds | null {
  const b = ev.detail.bounds;
  if (!b) return null;
  return { minLat: b.south, minLong: b.west, maxLat: b.north, maxLong: b.east };
}

export function MapView() {
  return (
    <GoogleMapsProvider>
      <MapCanvas />
    </GoogleMapsProvider>
  );
}

function MapCanvas() {
  const router = useRouter();
  const map = useMap();
  const [listings, setListings] = useState<LostFoundListing[]>([]);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // İlk kamera-hazır event'inde otomatik sorgu; sonrasında yalnızca buton.
  const loadedOnceRef = useRef(false);

  const runSearch = useCallback((bounds: MapBounds) => {
    startTransition(async () => {
      const result = await mapInBoundsAction(bounds);
      setListings(result);
      setShowSearchArea(false);
    });
  }, []);

  const handleCameraChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      const bounds = boundsFromEvent(ev);
      if (!bounds) return;
      setPendingBounds(bounds);
      if (!loadedOnceRef.current) {
        loadedOnceRef.current = true;
        runSearch(bounds);
        return;
      }
      // Kamera hareketinde sürekli sorgu YOK — kullanıcı "Bu alanı ara"ya basmalı.
      setShowSearchArea(true);
    },
    [runSearch],
  );

  function handleSearchArea() {
    if (pendingBounds) runSearch(pendingBounds);
  }

  function handleLocate() {
    setLocateError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateError('Tarayıcın konum servislerini desteklemiyor.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!map) return;
        map.panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
        map.setZoom(14);
      },
      () => setLocateError('Konumuna erişilemedi.'),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLOR.kayip.background }}
            aria-hidden
          />
          Kayıp
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLOR.bulundu.background }}
            aria-hidden
          />
          Bulundu
        </span>
      </div>

      <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-2xl border">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          // Cloud-based map styling henüz kurulmadı — Google'ın Advanced
          // Markers testi için resmi olarak dokümante ettiği Map ID
          // (bkz. developers.google.com/maps/documentation/javascript/advanced-markers/start).
          // Gerçek bir Map ID Cloud Console'da oluşturulup buraya geçmeden
          // önce prod'a çıkılmamalı — key/billing gibi kullanıcı tarafından
          // sağlanacak bir yapılandırma adımı.
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          onCameraChanged={handleCameraChanged}
          className="h-full w-full"
        >
          {listings.map((listing) => {
            if (listing.lat == null || listing.long == null || !isMapStatus(listing.status)) return null;
            const color = MARKER_COLOR[listing.status];
            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.long }}
                onClick={() => router.push(`/lost-found/${listing.id}`)}
              >
                <Pin background={color.background} borderColor={color.border} glyphColor={color.border} />
              </AdvancedMarker>
            );
          })}
        </Map>

        <div className="absolute right-3 top-3">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="shadow-md"
            onClick={handleLocate}
            aria-label="Konumumu bul"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        </div>

        {showSearchArea && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2">
            <Button type="button" size="sm" className="shadow-md" onClick={handleSearchArea} disabled={isPending}>
              <Search className="mr-1.5 h-4 w-4" />
              {isPending ? 'Aranıyor…' : 'Bu alanı ara'}
            </Button>
          </div>
        )}
      </div>

      {locateError && <p className="text-sm text-muted-foreground">{locateError}</p>}
    </div>
  );
}
