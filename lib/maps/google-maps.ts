// Server-safe: '@vis.gl/react-google-maps' BİLEREK burada import edilmiyor.
// O paket modül seviyesinde React.createContext(...) çağırıyor; Next'in
// Server Component / RSC bundle'ında React'ın "react-server" export
// condition'ı createContext sağlamaz (Context server'da anlamsız), bu da
// import anında "createContext is not a function" ile build'i kırıyor
// (denendi — bkz. maps-provider.tsx yorumu). Bu dosya yalnızca hasMapsKey()
// gibi server'dan da çağrılabilecek düz fonksiyonlar içerir; asıl
// <GoogleMapsProvider> client bileşeni ayrı, 'use client' işaretli
// maps-provider.tsx'te.

// NEXT_PUBLIC_* Next.js tarafından build-time'da inline edilir — hem server
// hem client'ta okunabilir (bkz. CLAUDE.md metadataBase notu, aynı desen).
export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function hasMapsKey(): boolean {
  return typeof MAPS_API_KEY === 'string' && MAPS_API_KEY.length > 0;
}
