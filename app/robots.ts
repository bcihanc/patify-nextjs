import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/app-links'
import { AUTHED_PREFIXES } from '@/lib/supabase/middleware'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...AUTHED_PREFIXES, '/auth'],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  }
}
