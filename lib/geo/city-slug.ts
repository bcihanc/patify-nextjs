import { TURKEY_CITIES } from './turkey'

const ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }

export function citySlug(city: string): string {
  return city
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ASCII[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SLUG_TO_CITY = new Map(TURKEY_CITIES.map((c) => [citySlug(c), c]))
if (SLUG_TO_CITY.size !== TURKEY_CITIES.length) throw new Error('city-slug: duplicate slug')

export function cityFromSlug(slug: string): string | null {
  return SLUG_TO_CITY.get(slug) ?? null
}
