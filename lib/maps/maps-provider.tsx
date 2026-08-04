'use client';

import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MAPS_API_KEY, hasMapsKey } from './google-maps';

// Ayrı dosya + 'use client' — google-maps.ts'in server-safe kalması için
// (bkz. o dosyadaki yorum). Bu bileşen yalnızca zaten client olan bir ağaçtan
// (map-view.tsx) mount edilmeli; page.tsx zaten hasMapsKey() ile öncesinde
// gate'liyor, ama burada da tekrar kontrol ediyoruz — key yoksa children
// yerine null döner, crash yok.
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  if (!hasMapsKey()) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- hasMapsKey() az önce doğruladı
  return <APIProvider apiKey={MAPS_API_KEY!}>{children}</APIProvider>;
}
