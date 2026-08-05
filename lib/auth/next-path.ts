// Validates a post-login return target as a LOCAL path only, blocking
// open-redirects (absolute URLs, protocol-relative `//host`, backslash tricks).
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}

// Builds a login URL that returns to `next` (or the LF feed if `next` is
// unsafe/absent). Pure — safe to import from client components.
export function loginWallHref(next: string | null | undefined): string {
  const safe = safeNextPath(next) ?? '/lost-found';
  return `/auth/login?next=${encodeURIComponent(safe)}`;
}
