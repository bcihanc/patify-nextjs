import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/app-links'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/auth', '/profile', '/chats', '/notifications', '/complete-profile', '/accept-consent'],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  }
}
