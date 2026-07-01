'use client'

import { Button } from '@/components/ui/button'

// Real applicationId (matches AndroidManifest + assetlinks.json). The Play
// listing and the App Link intent both key off this — NOT the stale
// com.patify.app string in hero.tsx.
const IOS_STORE = 'https://apps.apple.com/tr/app/patify/id6478046323'
const PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.bcc.buschat'

/**
 * "Open in app" CTA for a lost&found item page.
 *
 * Why a client component instead of a plain <a>: opening the installed app from
 * a web page is platform-specific and cannot be a same-domain link.
 *  - iOS: a link from patify.net to patify.net does NOT trigger the Universal
 *    Link (Apple blocks same-domain in Safari). The Smart App Banner
 *    (apple-itunes-app meta on the page) provides the real "open" affordance;
 *    this button is the download fallback → App Store.
 *  - Android: an intent:// URL opens the app via the verified App Link, or
 *    falls back to the Play Store automatically when the app isn't installed.
 *
 * `path` is the in-app deep-link path, e.g. "/lost-found/item/<id>".
 */
export function OpenInAppButton({
  path,
  label,
  className,
}: {
  path: string
  label: string
  className?: string
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

    if (/Android/i.test(ua)) {
      e.preventDefault()
      // Opens the app through the verified https App Link; browser_fallback_url
      // sends users without the app to the Play Store.
      const intent =
        `intent://patify.net${path}` +
        `#Intent;scheme=https;package=com.bcc.buschat;` +
        `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`
      window.location.href = intent
      return
    }

    if (/iPhone|iPad|iPod/i.test(ua)) {
      e.preventDefault()
      // Same-domain Universal Links won't open the app from Safari; the Smart
      // App Banner handles opening. Here we send them to download the app.
      window.location.href = IOS_STORE
      return
    }
    // Desktop / unknown: follow the default href (Play Store landing).
  }

  return (
    <Button asChild className={className}>
      <a href={PLAY_STORE} onClick={handleClick}>
        {label}
      </a>
    </Button>
  )
}
