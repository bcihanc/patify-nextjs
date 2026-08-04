'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { LocateFixed, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleMapsProvider } from '@/lib/maps/maps-provider';
import { adoptionsInBoundsAction } from '@/lib/adoptions/actions';
import { EMPTY_ADOPTION_FILTERS } from '@/lib/adoptions/types';
import type { AdoptionListing } from '@/lib/adoptions/types';
import type { MapBounds } from '@/lib/adoptions/read';

// Türkiye/İstanbul merkezli makul varsayılan — page.tsx bu bileşeni yalnızca
// hasMapsKey() true iken render eder (graceful degrade orada).
const DEFAULT_CENTER = { lat: 41.0082, lng: 28.9784 };
const DEFAULT_ZOOM = 11;

// adoptions_in_bounds yalnızca open (adopted olmayan) satır döndürür — bkz.
// spec §5.10. Yine de F3'teki savunmacı filtre deseni korunuyor: status
// beklenenin dışına çıkarsa marker hiç render edilmez.
function isOpenStatus(status: AdoptionListing['status']): boolean {
  return status === 'open';
}

// F0/F3 renk kararıyla tutarlı: açık/pozitif durum için "success" yeşili
// (adoption-status-badge.tsx'te open için ayrı bir renk yok çünkü varsayılan
// durum o — burada Pin düz renk string'i aldığı için aynı hex tekrar edilir).
const OPEN_MARKER_COLOR = { background: '#22c55e', border: '#15803d' };

function boundsFromEvent(ev: MapCameraChangedEvent): MapBounds | null {
  const b = ev.detail.bounds;
  if (!b) return null;
  return { minLat: b.south, minLong: b.west, maxLat: b.north, maxLong: b.east };
}

export function AdoptionMapView() {
  return (
    <GoogleMapsProvider>
      <MapCanvas />
    </GoogleMapsProvider>
  );
}

function MapCanvas() {
  const router = useRouter();
  const map = useMap();
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // İlk kamera-hazır event'inde otomatik sorgu; sonrasında yalnızca buton.
  const loadedOnceRef = useRef(false);

  const runSearch = useCallback((bounds: MapBounds) => {
    startTransition(async () => {
      const result = await adoptionsInBoundsAction(bounds, EMPTY_ADOPTION_FILTERS);
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
            if (listing.lat == null || listing.long == null || !isOpenStatus(listing.status)) return null;
            return (
              <AdvancedMarker
                key={listing.id}
                position={{ lat: listing.lat, lng: listing.long }}
                onClick={() => router.push(`/adoptions/${listing.id}`)}
              >
                <Pin
                  background={OPEN_MARKER_COLOR.background}
                  borderColor={OPEN_MARKER_COLOR.border}
                  glyphColor={OPEN_MARKER_COLOR.border}
                />
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
