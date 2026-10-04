import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MapPin, HeartHandshake } from 'lucide-react'
import { getPublicEmergencyById } from '@/lib/emergency/public'
import {
  EMERGENCY_KIND_LABELS,
  EMERGENCY_STATUS_LABELS,
  petTypeLabel,
} from '@/lib/emergency/types'
import { createClient } from '@/lib/supabase/server'
import { IOS_APP_ID, SITE_ORIGIN } from '@/lib/app-links'
import { OpenInAppButton } from '@/components/open-in-app-button'
import { EntityActionMenu } from '@/components/shared/entity-action-menu'
import { Button } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const item = await getPublicEmergencyById(id)
  if (!item) return { title: 'İlan bulunamadı · Patify' }

  const title =
    item.status === 'cozuldu'
      ? 'Çözüldü · Patify'
      : `ACİL · ${EMERGENCY_KIND_LABELS[item.kind]} ${petTypeLabel(item.petType)} · Patify`
  const description = [[item.city, item.district].filter(Boolean).join(', '), item.description]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 160)

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
    // iOS Smart App Banner: opens the installed app straight to this case.
    itunes: {
      appId: IOS_APP_ID,
      appArgument: `${SITE_ORIGIN}/emergency/case/${id}`,
    },
  }
}

export default async function PublicEmergencyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getPublicEmergencyById(id)
  if (!item) notFound()

  if (item.status === 'cozuldu') {
    return (
      <section className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <HeartHandshake className="h-12 w-12 text-emerald-500" aria-hidden />
        <h1 className="text-2xl font-bold">Bu vaka çözüldü 🙏</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photoUrl}
          alt=""
          className="h-40 w-40 rounded-2xl object-cover opacity-50 grayscale"
        />
        <p className="max-w-sm text-muted-foreground">
          Patify, yardıma ihtiyacı olan sokak hayvanlarına hızla ulaşılmasını sağlar.
        </p>
        <OpenInAppButton path={`/emergency/case/${id}`} label="Patify'ı İndir" />
      </section>
    )
  }

  // Cookie-bound client only so EntityActionMenu can enable "report" for
  // logged-in viewers. No reporter info is rendered on this page (privacy).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const location = [item.city, item.district].filter(Boolean).join(' · ')
  // Street animal: coordinates are intentionally not masked.
  const mapHref = item.lat != null && item.long != null
    ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.long}`
    : null

  const help =
    item.status === 'ustlenildi'
      ? {
          title: 'Bu vaka üstlenildi',
          body: 'Gelişmeleri takip etmek ve bildiren kişiye yazmak için Patify uygulamasını aç.',
        }
      : item.kind === 'olu'
        ? {
            title: 'Bildirim ayrıntıları',
            body: 'Ayrıntılar ve bildiren kişiye ulaşmak için Patify uygulamasını aç.',
          }
        : {
            title: 'Yardım edebilir misin?',
            body: 'Vakayı üstlenmek ve bildiren kişiye yazmak için Patify uygulamasını aç.',
          }

  return (
    <section className="flex-1 flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="rounded-md bg-red-600 py-3 text-center text-xl font-extrabold tracking-wide text-white">
          ⚠ ACİL · {EMERGENCY_KIND_LABELS[item.kind].toLocaleUpperCase('tr-TR')}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photoUrl}
          alt={petTypeLabel(item.petType)}
          className="aspect-square w-full rounded-2xl object-cover"
        />

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{petTypeLabel(item.petType)}</h1>
          <EntityActionMenu
            entity="emergency"
            entityId={id}
            isOwner={false}
            currentUserId={user?.id ?? null}
            shareUrl={`${SITE_ORIGIN}/emergency/case/${id}`}
            shareText={`${EMERGENCY_KIND_LABELS[item.kind]} · ${petTypeLabel(item.petType)}`}
          />
        </div>

        <p className="text-sm font-medium">{EMERGENCY_STATUS_LABELS[item.status]}</p>

        {location && (
          <span className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden /> {location}
          </span>
        )}

        {item.description && (
          <p className="text-muted-foreground whitespace-pre-line">{item.description}</p>
        )}

        {mapHref && (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <a href={mapHref} target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
              Haritada gör
            </a>
          </Button>
        )}

        <div className="mt-2 flex flex-col gap-2 rounded-2xl border p-4">
          <p className="font-semibold">{help.title}</p>
          <p className="text-sm text-muted-foreground">{help.body}</p>
          <OpenInAppButton
            path={`/emergency/case/${id}`}
            label="Uygulamada Aç"
            className="mt-1"
          />
        </div>
      </div>
    </section>
  )
}
