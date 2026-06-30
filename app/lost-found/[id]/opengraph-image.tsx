// app/lost-found/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getLostFoundById, petTypeLabel } from '@/lib/lost-found'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Patify kayıp ilanı'

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getLostFoundById(id)

  const title =
    !listing ? 'Patify'
    : listing.status === 'cozuldu' ? 'Ailesine kavuştu 🎉'
    : listing.status === 'bulundu' ? 'BULUNDU · SAHİBİ ARANIYOR'
    : 'KAYIP'

  const subtitle = listing
    ? [listing.breed, petTypeLabel(listing.type), listing.city].filter(Boolean).join(' · ')
    : 'patify.net'

  const photo = listing?.images?.[0] ?? null

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
          // ImageResponse uses plain <img>; absolute URL required.
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
          <div style={{ fontSize: 64, fontWeight: 800 }}>⚠ {title}</div>
          <div style={{ fontSize: 40 }}>{subtitle}</div>
          <div style={{ fontSize: 32, opacity: 0.7 }}>patify.net</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
