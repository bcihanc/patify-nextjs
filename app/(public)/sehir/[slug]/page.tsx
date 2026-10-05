import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cityFromSlug } from '@/lib/geo/city-slug'
import { browsePublicLostFound } from '@/lib/lost-found'
import { browsePublicAdoptions } from '@/lib/adoptions/public'
import { browsePublicEmergency } from '@/lib/emergency/public'
import { SITE_ORIGIN } from '@/lib/app-links'
import { LfListingCard } from '@/components/lost-found/lf-listing-card'
import { AdoptionCard } from '@/components/adoptions/adoption-card'
import { EmergencyCard } from '@/components/emergency/emergency-card'

const LIMIT = 24
const THIN_THRESHOLD = 3

const loadCity = (city: string) =>
  Promise.all([
    browsePublicLostFound(city, LIMIT),
    browsePublicAdoptions(city, LIMIT),
    browsePublicEmergency(city, LIMIT),
  ])

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const city = cityFromSlug(slug)
  if (!city) return { title: 'Sayfa bulunamadı · Patify' }

  const [lf, adoptions, emergency] = await loadCity(city)
  const total = lf.length + adoptions.length + emergency.length

  return {
    title: `${city} kayıp, bulunan ve sahiplendirme ilanları · Patify`,
    description: `Patify'da ${city} için güncel kayıp, bulunan, sahiplendirme ve acil hayvan ilanları.`,
    alternates: { canonical: `${SITE_ORIGIN}/sehir/${slug}` },
    ...(total < THIN_THRESHOLD && { robots: { index: false, follow: true } }),
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </section>
  )
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const city = cityFromSlug(slug)
  if (!city) notFound()

  const [lf, adoptions, emergency] = await loadCity(city)
  const empty = lf.length + adoptions.length + emergency.length === 0

  return (
    <div className="flex flex-col gap-8 w-full">
      <h1 className="text-2xl font-bold">{city} hayvan ilanları</h1>

      {lf.length > 0 && (
        <Section title="Kayıp ve bulunan">
          {lf.map((l) => (
            <LfListingCard key={l.id} listing={l} isGuest />
          ))}
        </Section>
      )}
      {adoptions.length > 0 && (
        <Section title="Sahiplendirme">
          {adoptions.map((a) => (
            <AdoptionCard key={a.id} listing={a} href={`/adoptions/adoption/${a.id}`} />
          ))}
        </Section>
      )}
      {emergency.length > 0 && (
        <Section title="Acil">
          {emergency.map((e) => (
            <EmergencyCard key={e.id} item={e} href={`/emergency/case/${e.id}`} />
          ))}
        </Section>
      )}

      {empty && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">Bu ilde şu an aktif ilan yok.</p>
          <Link href="/indir" className="underline">
            Patify&apos;ı indir, ilk ilanı sen aç
          </Link>
        </div>
      )}
    </div>
  )
}
