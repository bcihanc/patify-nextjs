import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/app-links'
import { citySlug } from '@/lib/geo/city-slug'
import { browsePublicLostFound } from '@/lib/lost-found'
import { browsePublicAdoptions } from '@/lib/adoptions/public'
import { browsePublicEmergency } from '@/lib/emergency/public'

export const revalidate = 3600

const PER_TYPE_LIMIT = 1000
const CITY_MIN_LISTINGS = 3

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lf, adoptions, emergency] = await Promise.all([
    browsePublicLostFound(null, PER_TYPE_LIMIT),
    browsePublicAdoptions(null, PER_TYPE_LIMIT),
    browsePublicEmergency(null, PER_TYPE_LIMIT),
  ])

  const listings = [
    ...lf.map((l) => ({ path: `/lost-found/item/${l.id}`, city: l.city, createdAt: l.createdAt })),
    ...adoptions.map((l) => ({ path: `/adoptions/adoption/${l.id}`, city: l.city, createdAt: l.createdAt })),
    ...emergency.map((l) => ({ path: `/emergency/case/${l.id}`, city: l.city, createdAt: l.createdAt })),
  ]

  const perCity = new Map<string, number>()
  for (const l of listings) {
    if (l.city) perCity.set(l.city, (perCity.get(l.city) ?? 0) + 1)
  }

  return [
    ...['/', '/indir', '/pp', '/tos'].map((p) => ({ url: `${SITE_ORIGIN}${p}` })),
    ...listings.map((l) => ({ url: `${SITE_ORIGIN}${l.path}`, lastModified: l.createdAt })),
    ...[...perCity]
      .filter(([, n]) => n >= CITY_MIN_LISTINGS)
      .map(([city]) => ({ url: `${SITE_ORIGIN}/sehir/${citySlug(city)}` })),
  ]
}
