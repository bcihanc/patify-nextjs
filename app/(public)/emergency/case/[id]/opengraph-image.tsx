import { ImageResponse } from 'next/og'
import { getPublicEmergencyById } from '@/lib/emergency/public'
import { EMERGENCY_KIND_LABELS, petTypeLabel } from '@/lib/emergency/types'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Patify acil ilanı'
export const revalidate = 60

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getPublicEmergencyById(id)

  // Single-string headline keeps the title <div> at one child (Satori).
  const headline = !item
    ? 'Patify'
    : item.status === 'cozuldu'
      ? 'Çözüldü'
      : `⚠ ACİL · ${EMERGENCY_KIND_LABELS[item.kind].toLocaleUpperCase('tr-TR')}`

  const subtitle = item
    ? [petTypeLabel(item.petType), item.city].filter(Boolean).join(' · ')
    : 'patify.net'

  const photo = item?.photoUrl ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#18181b',
          color: 'white',
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={500}
            height={630}
            style={{ width: 500, height: 630, objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 60,
            gap: 16,
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 800 }}>{headline}</div>
          <div style={{ fontSize: 40 }}>{subtitle}</div>
          <div style={{ fontSize: 32, opacity: 0.7 }}>patify.net</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
