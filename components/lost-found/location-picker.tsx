'use client';

import { useState } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { Check, LocateFixed, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasMapsKey } from '@/lib/maps/google-maps';
import { GoogleMapsProvider } from '@/lib/maps/maps-provider';

// map-view.tsx ile aynı Türkiye/İstanbul merkezli makul varsayılan — initial
// yoksa (ör. henüz şehir seçilmemiş create formu) haritanın başlangıç merkezi.
const DEFAULT_CENTER = { lat: 41.0082, lng: 28.9784 };

export type LocationPickerProps = {
  initial?: { lat: number; lng: number } | null;
  onChange: (wkt: string | null) => void;
};

// hasMapsKey() false ise null döner — form yalnızca şehir/ilçe seçimi ve
// "Konumumu bul" geolocation'a düşer, crash yok (spec §6.10 graceful degrade).
export function LocationPicker({ initial, onChange }: LocationPickerProps) {
  if (!hasMapsKey()) return null;
  return (
    <GoogleMapsProvider>
      <PickerCanvas initial={initial} onChange={onChange} />
    </GoogleMapsProvider>
  );
}

function PickerCanvas({ initial, onChange }: LocationPickerProps) {
  const map = useMap();
  const [locateError, setLocateError] = useState<string | null>(null);

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
        map.setZoom(16);
      },
      () => setLocateError('Konumuna erişilemedi.'),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  function handleConfirm() {
    const center = map?.getCenter();
    if (!center) return;
    // WKT longitude-first — sıra değişirse konum yanlış kaydedilir (bkz. lib/lost-found/actions.ts).
    onChange(`POINT(${center.lng()} ${center.lat()})`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-64 w-full overflow-hidden rounded-md border border-input">
        <Map
          defaultCenter={initial ?? DEFAULT_CENTER}
          defaultZoom={initial ? 16 : 12}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          className="h-full w-full"
        />
        {/* Sabit-merkez pin: harita altında kayar, pin overlay olarak yerinde
            kalır — draggable marker DEĞİL (spec §6.10). */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-8 w-8 text-primary drop-shadow-md" aria-hidden />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!map} onClick={handleLocate}>
          <LocateFixed className="mr-1.5 h-4 w-4" aria-hidden />
          Konumumu bul
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!map} onClick={handleConfirm}>
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
          Bu konumu seç
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X className="mr-1.5 h-4 w-4" aria-hidden />
          Temizle
        </Button>
      </div>
      {locateError && <p className="text-sm text-destructive">{locateError}</p>}
    </div>
  );
}
