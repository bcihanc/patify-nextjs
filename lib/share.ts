// Client-only sharing helper. Guards `typeof navigator` so it stays safe to
// import from a client component even if evaluated during SSR/module init.
export async function shareOrCopy(
  url: string,
  text?: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator === 'undefined') return 'failed';

  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch {
      // AbortError (user cancelled the native share sheet) or any other
      // failure — swallow silently, nothing useful to surface either way.
      return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
