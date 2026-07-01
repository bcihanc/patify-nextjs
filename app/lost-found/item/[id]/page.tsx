// app/lost-found/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MapPin, Calendar, PartyPopper } from 'lucide-react'
import { getLostFoundById, petTypeLabel, type LostFoundListing } from '@/lib/lost-found'
import { OpenInAppButton } from '@/components/open-in-app-button'

// Numeric App Store id (from the live listing) used by the iOS Smart App Banner.
const IOS_APP_ID = '6478046323'

function headline(status: LostFoundListing['status']): string {
  if (status === 'bulundu') return 'BULUNDU · SAHİBİ ARANIYOR'
  return 'KAYIP'
}

function petLine(l: LostFoundListing): string {
  return [l.breed, petTypeLabel(l.type), l.color].filter(Boolean).join(' · ')
}

function locationLine(l: LostFoundListing): string {
  return [l.city, l.district].filter(Boolean).join(', ')
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  // iso is a date-only 'YYYY-MM-DD'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getLostFoundById(id)
  if (!listing) return { title: 'İlan bulunamadı · Patify' }

  const title =
    listing.status === 'cozuldu'
      ? 'Ailesine kavuştu 🎉 · Patify'
      : `${headline(listing.status)} · ${petLine(listing)} · Patify`
  const description = [locationLine(listing), listing.description]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 160)

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
    // iOS Smart App Banner: shows a native "Patify · AÇ" bar that opens the
    // installed app straight to this listing (app-argument). This is the only
    // reliable way to open the app from a same-domain Safari page.
    itunes: {
      appId: IOS_APP_ID,
      appArgument: `https://patify.net/lost-found/item/${id}`,
    },
  }
}

export default async function LostFoundListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getLostFoundById(id)
  if (!listing) notFound()

  const photo = listing.images?.[0] ?? null

  // Reunited → celebration screen.
  if (listing.status === 'cozuldu') {
    return (
      <section className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <PartyPopper className="h-12 w-12 text-emerald-500" aria-hidden />
        <h1 className="text-2xl font-bold">Bu dostumuz ailesine kavuştu 🎉</h1>
        {photo && (
          // Plain <img> on purpose — avoids next.config remotePatterns (WIP conflict).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-40 w-40 rounded-2xl object-cover opacity-50 grayscale"
          />
        )}
        <p className="max-w-sm text-muted-foreground">
          Patify, kaybolan dostların ailelerine kavuşmasına yardımcı olur.
        </p>
        <OpenInAppButton
          path={`/lost-found/item/${id}`}
          label="Patify'ı İndir"
        />
      </section>
    )
  }

  // Active listing (kayip / bulundu).
  return (
    <section className="flex-1 flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="rounded-md bg-zinc-900 py-3 text-center text-xl font-extrabold tracking-wide text-white">
          ⚠ {headline(listing.status)}
        </div>

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={petLine(listing)}
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="aspect-[4/5] w-full rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
            Fotoğraf yok
          </div>
        )}

        <h1 className="text-2xl font-bold">{petLine(listing)}</h1>

        <div className="flex flex-col gap-1 text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden /> {locationLine(listing)}
          </span>
          {formatDate(listing.lostDate) && (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden /> {formatDate(listing.lostDate)}
            </span>
          )}
        </div>

        {listing.description && (
          <p className="text-muted-foreground whitespace-pre-line">{listing.description}</p>
        )}

        <div className="mt-2 flex flex-col gap-2 rounded-2xl border p-4">
          <p className="font-semibold">Bu dostu gördün mü?</p>
          <p className="text-sm text-muted-foreground">
            İlan sahibiyle iletişime geçmek için Patify uygulamasını aç.
          </p>
          <OpenInAppButton
            path={`/lost-found/item/${id}`}
            label="Uygulamada Aç"
            className="mt-1"
          />
        </div>
      </div>
    </section>
  )
}
