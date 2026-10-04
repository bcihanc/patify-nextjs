import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MapPin, PartyPopper } from 'lucide-react'
import { getPublicAdoptionById } from '@/lib/adoptions/public'
import {
  PET_AGE_LABELS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  petTypeLabel,
  type AdoptionListing,
} from '@/lib/adoptions/types'
import { createClient } from '@/lib/supabase/server'
import { IOS_APP_ID, SITE_ORIGIN } from '@/lib/app-links'
import { OpenInAppButton } from '@/components/open-in-app-button'
import { EntityActionMenu } from '@/components/shared/entity-action-menu'
import { AdoptionDomainInfoCards } from '@/components/adoptions/adoption-domain-info-cards'

const isAdopted = (l: AdoptionListing) => l.adopted || l.status === 'closed'

function traitLine(l: AdoptionListing): string {
  return [
    l.breed,
    petTypeLabel(l.type),
    l.size ? PET_SIZE_LABELS[l.size] : null,
    l.age ? PET_AGE_LABELS[l.age] : null,
    l.gender ? PET_GENDER_LABELS[l.gender] : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

const locationLine = (l: AdoptionListing) =>
  [l.city, l.district].filter(Boolean).join(', ')

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getPublicAdoptionById(id)
  if (!listing) return { title: 'İlan bulunamadı · Patify' }

  const title = isAdopted(listing)
    ? 'Yuva buldu 🎉 · Patify'
    : `YUVA ARIYOR · ${listing.title} · Patify`
  const description = [locationLine(listing), listing.description]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 160)

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
    // iOS Smart App Banner: opens the installed app straight to this listing.
    itunes: {
      appId: IOS_APP_ID,
      appArgument: `${SITE_ORIGIN}/adoptions/adoption/${id}`,
    },
  }
}

export default async function PublicAdoptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getPublicAdoptionById(id)
  if (!listing) notFound()

  const photo = listing.images?.[0] ?? null

  if (isAdopted(listing)) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <PartyPopper className="h-12 w-12 text-emerald-500" aria-hidden />
        <h1 className="text-2xl font-bold">Bu dost yuvasına kavuştu 🎉</h1>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-40 w-40 rounded-2xl object-cover opacity-50 grayscale"
          />
        )}
        <p className="max-w-sm text-muted-foreground">
          Patify, sahiplendirilecek dostların yeni yuvalarını bulmasına yardımcı olur.
        </p>
        <OpenInAppButton path={`/adoptions/adoption/${id}`} label="Patify'ı İndir" />
      </section>
    )
  }

  // Cookie-bound client only so EntityActionMenu can enable "report" for
  // logged-in viewers. No owner info is rendered on this page (privacy).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const traits = traitLine(listing)
  const location = locationLine(listing)

  return (
    <section className="flex-1 flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="rounded-md bg-zinc-900 py-3 text-center text-xl font-extrabold tracking-wide text-white">
          🏠 YUVA ARIYOR
        </div>

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={listing.title}
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="aspect-[4/5] w-full rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
            Fotoğraf yok
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <EntityActionMenu
            entity="adoptions"
            entityId={id}
            isOwner={false}
            currentUserId={user?.id ?? null}
            shareUrl={`${SITE_ORIGIN}/adoptions/adoption/${id}`}
            shareText={listing.title}
          />
        </div>

        {traits && <p className="text-sm text-muted-foreground">{traits}</p>}

        {location && (
          <span className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden /> {location}
          </span>
        )}

        {listing.description && (
          <p className="text-muted-foreground whitespace-pre-line">{listing.description}</p>
        )}

        <AdoptionDomainInfoCards listing={listing} />

        <div className="mt-2 flex flex-col gap-2 rounded-2xl border p-4">
          <p className="font-semibold">Bu dosta yuva olmak ister misin?</p>
          <p className="text-sm text-muted-foreground">
            Başvuru Patify uygulamasından yapılır.
          </p>
          <OpenInAppButton
            path={`/adoptions/adoption/${id}`}
            label="Uygulamada Aç"
            className="mt-1"
          />
        </div>
      </div>
    </section>
  )
}
