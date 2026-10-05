// Cookie-free, cached reader for the PUBLIC adoption page. The RPC never
// returns `pasif` rows to anon.
import { unstable_cache } from 'next/cache'
import { anonClient } from '@/lib/supabase/anon'
import { UUID_RE } from '@/lib/app-links'
import { mapRowToAdoption } from './read'
import type { AdoptionListing, AdoptionRow } from './types'

export async function getPublicAdoptionById(id: string): Promise<AdoptionListing | null> {
  if (!UUID_RE.test(id)) return null

  const load = unstable_cache(
    async (): Promise<AdoptionListing | null> => {
      const { data, error } = await anonClient()
        .rpc('get_adoption_by_id', { p_id: id })
        .returns<AdoptionRow[]>()
      // Throw so transient RPC errors are not cached; missing rows are.
      if (error) throw error
      const rows = data as AdoptionRow[] | null
      if (!rows || rows.length === 0) return null
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return mapRowToAdoption(rows[0]!)
    },
    ['adoption-by-id', id],
    { revalidate: 60, tags: [`adoption-${id}`] },
  )
  try {
    return await load()
  } catch (error) {
    console.error('getPublicAdoptionById:', error instanceof Error ? error.message : String(error))
    return null
  }
}

export async function browsePublicAdoptions(city: string | null, limit: number): Promise<AdoptionListing[]> {
  const load = unstable_cache(
    async (): Promise<AdoptionListing[]> => {
      const { data, error } = await anonClient()
        .rpc('browse_adoptions', {
          limits: limit,
          offsets: 0,
          city_param: city,
        })
        .returns<AdoptionRow[]>()
      // Throw so transient RPC errors are not cached.
      if (error) throw error
      return ((data as AdoptionRow[] | null) ?? []).map(mapRowToAdoption)
    },
    ['adoption-browse-public', city ?? '*', String(limit)],
    { revalidate: 600 },
  )
  try {
    return await load()
  } catch (error) {
    console.error('browsePublicAdoptions:', error instanceof Error ? error.message : String(error))
    return []
  }
}
