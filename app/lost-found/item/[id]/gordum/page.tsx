import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLostFoundById, petTypeLabel } from '@/lib/lost-found'
import { OpenInAppButton } from '@/components/open-in-app-button'
import { SightingForm } from './sighting-form'

export const metadata: Metadata = {
  title: 'Gördüm Raporu · Patify',
  robots: { index: false },
}

export default async function GordumPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getLostFoundById(id)
  if (!listing) notFound()

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const photo = listing.images?.[0] ?? null
  const petLine = [listing.breed, petTypeLabel(listing.type), listing.color]
    .filter(Boolean)
    .join(' · ')

  if (listing.status === 'cozuldu') {
    return (
      <section className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Bu dostumuz ailesine kavuştu 🎉</h1>
        <OpenInAppButton path={`/lost-found/item/${id}`} label="Patify'ı İndir" />
      </section>
    )
  }

  return (
    <section className="flex-1 flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
          )}
          <div>
            <p className="font-semibold">{petLine}</p>
            <p className="text-sm text-muted-foreground">
              {[listing.city, listing.district].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold">Bu dostu gördün mü? Bilgi ver 🙏</h1>
        {siteKey ? (
          <SightingForm lostFoundId={id} siteKey={siteKey} />
        ) : (
          <div className="rounded-2xl border p-4 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              İlan sahibiyle iletişime geçmek için Patify uygulamasını aç.
            </p>
            <OpenInAppButton path={`/lost-found/item/${id}`} label="Uygulamada Aç" />
          </div>
        )}
      </div>
    </section>
  )
}
