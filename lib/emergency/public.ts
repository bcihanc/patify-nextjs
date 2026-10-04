// Cookie-free, cached reader for the PUBLIC emergency page. The RPC never
// returns `pasif` rows to anon.
import { unstable_cache } from 'next/cache'
import { anonClient } from '@/lib/supabase/anon'
import { UUID_RE } from '@/lib/app-links'
import { mapRowToEmergency } from './read'
import type { EmergencyListing, EmergencyRow } from './types'

export async function getPublicEmergencyById(id: string): Promise<EmergencyListing | null> {
  if (!UUID_RE.test(id)) return null

  const load = unstable_cache(
    async (): Promise<EmergencyListing | null> => {
      const { data, error } = await anonClient()
        .rpc('get_emergency_case_by_id', { case_id: id })
        .returns<EmergencyRow[]>()
      // Throw so transient RPC errors are not cached; missing rows are.
      if (error) throw error
      const rows = data as EmergencyRow[] | null
      if (!rows || rows.length === 0) return null
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return mapRowToEmergency(rows[0]!)
    },
    ['emergency-case-by-id', id],
    { revalidate: 60, tags: [`emergency-${id}`] },
  )
  try {
    return await load()
  } catch (error) {
    console.error('getPublicEmergencyById:', error instanceof Error ? error.message : String(error))
    return null
  }
}
