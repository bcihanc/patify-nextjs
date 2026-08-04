// Mobil PatifyValidators.safeSocialUrl (lib/utils/validators.dart) TS portu.
// Sosyal linkler kullanıcı-girdisi keyfi string'lerdir; yalnızca https ve
// allow-list host'una çözülen değer döndürülür — crafted look-alike host
// (ör. https://instagram-login.evil.tr) veya javascript:/mailto: reddedilir.

export const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
export const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com']);
export const FACEBOOK_HOSTS = new Set([
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
]);
export const X_HOSTS = new Set([
  'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com',
]);
export const TELEGRAM_HOSTS = new Set([
  't.me', 'telegram.me', 'www.telegram.me', 'telegram.org',
]);

export function safeSocialUrl(
  input: string | null | undefined,
  allowedHosts: Set<string>,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Şemasız "instagram.com/handle" → https'e zorla; yabancı şema (javascript:,
  // mailto:, ftp://…) korunur ve aşağıdaki https kontrolünde reddedilir.
  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  let uri: URL;
  try {
    uri = new URL(candidate);
  } catch {
    return null;
  }
  if (uri.protocol !== 'https:') return null;
  const host = uri.hostname.toLowerCase();
  if (!host || !allowedHosts.has(host)) return null;
  return uri.toString();
}
