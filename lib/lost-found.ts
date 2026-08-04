// lib/lost-found.ts
import { createClient } from '@/lib/supabase/server'

export type PetType =
  | 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster'
  | 'fish' | 'turtle' | 'reptile' | 'other'

export type LfStatus = 'kayip' | 'bulundu' | 'cozuldu' | 'pasif'

export type LostFoundListing = {
  id: string
  type: PetType
  breed: string | null
  color: string | null
  gender: string | null
  city: string
  district: string | null
  status: LfStatus
  lostDate: string | null
  description: string | null
  images: string[] | null
}

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: 'Köpek',
  cat: 'Kedi',
  bird: 'Kuş',
  rabbit: 'Tavşan',
  hamster: 'Hamster',
  fish: 'Balık',
  turtle: 'Kaplumbağa',
  reptile: 'Sürüngen',
  other: 'Diğer',
}

export function petTypeLabel(t: PetType): string {
  return PET_TYPE_LABELS[t] ?? 'Diğer'
}

// Storage filenames → full public URLs. The `assets` bucket is public
// (verified: HTTP 200 + CORS *). The RPC returns bare filenames.
const STORAGE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`

function toImageUrl(fileName: string): string {
  return `${STORAGE_PUBLIC_BASE}/${fileName}`
}

// RPC returns snake_case columns; map to our camelCase shape.
type RpcRow = {
  id: string
  type: PetType
  breed: string | null
  color: string | null
  gender: string | null
  city: string
  district: string | null
  status: LfStatus
  lost_date: string | null
  description: string | null
  images: string[] | null
}

export async function getLostFoundById(
  id: string,
): Promise<LostFoundListing | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('get_lost_found_by_id', { p_id: id })
    .returns<RpcRow[]>()

  if (error || !data) return null
  const rows = data as RpcRow[]
  if (rows.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const r = rows[0]!
  return {
    id: r.id,
    type: r.type,
    breed: r.breed,
    color: r.color,
    gender: r.gender,
    city: r.city,
    district: r.district,
    status: r.status,
    lostDate: r.lost_date,
    description: r.description,
    images: r.images?.map(toImageUrl) ?? null,
  }
}
