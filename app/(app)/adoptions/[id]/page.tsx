import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MapPin, PawPrint } from 'lucide-react';
import { getAdoptionById } from '@/lib/adoptions/read';
import { getCurrentUserProfile } from '@/lib/profile/server';
import {
  ADOPTION_SOURCE_LABELS,
  PET_AGE_LABELS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  petTypeLabel,
  type AdoptionListing,
} from '@/lib/adoptions/types';
import { AdoptionDomainInfoCards } from '@/components/adoptions/adoption-domain-info-cards';
import { AdoptionOwnerActions } from '@/components/adoptions/adoption-owner-actions';
import { AdoptionStatusBadge } from '@/components/adoptions/adoption-status-badge';
import { UserAvatar } from '@/components/user/user-avatar';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Same "eski" staleness signal as AdoptionCard (card.tsx), duplicated rather
// than extracted into a shared util — matches the existing F3/adoptions
// convention of a small per-component helper over a one-off shared module.
function isStale(lifecycleLastActivityAt: string): boolean {
  return Date.now() - new Date(lifecycleLastActivityAt).getTime() > THIRTY_DAYS_MS;
}

function traitLine(l: AdoptionListing): string {
  return [
    l.breed,
    petTypeLabel(l.type),
    l.size ? PET_SIZE_LABELS[l.size] : null,
    l.age ? PET_AGE_LABELS[l.age] : null,
    l.gender ? PET_GENDER_LABELS[l.gender] : null,
    l.source ? ADOPTION_SOURCE_LABELS[l.source] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default async function AdoptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const listing = await getAdoptionById(id);
  if (!listing) notFound();

  const isOwner = listing.userId === me.id;

  const images = listing.images ?? [];
  const hero = images[0];
  const thumbs = images.slice(1);
  const location = [listing.city, listing.district].filter(Boolean).join(', ');
  const traits = traitLine(listing);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        {hero ? (
          // Plain <img> on purpose — next/image remotePatterns not configured (F0/F2/F3 idiom).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt={listing.title}
            className="aspect-square w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <PawPrint className="h-10 w-10" aria-hidden />
          </div>
        )}
        {thumbs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {thumbs.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <AdoptionStatusBadge status={listing.status} />
        {isStale(listing.lifecycleLastActivityAt) && (
          <span className="text-xs text-muted-foreground">· eski</span>
        )}
      </div>

      {traits && <p className="text-sm text-muted-foreground">{traits}</p>}

      {location && (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden /> {location}
        </span>
      )}

      <h1 className="text-2xl font-bold">{listing.title}</h1>

      {listing.description && (
        <p className="whitespace-pre-line text-muted-foreground">{listing.description}</p>
      )}

      <AdoptionDomainInfoCards listing={listing} />

      <div className="flex items-center gap-3 rounded-xl border p-3">
        <UserAvatar
          username={listing.user?.username ?? null}
          profilePhoto={listing.user?.profilePhoto ?? null}
          size={40}
        />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">İlan sahibi</span>
          <Link href={`/profile/user/${listing.userId}`} className="font-medium hover:underline">
            {listing.user?.username ?? 'Kullanıcı'}
          </Link>
        </div>
      </div>

      {isOwner && (
        <AdoptionOwnerActions
          listing={{
            id: listing.id,
            status: listing.status,
            adopted: listing.adopted,
            images: listing.images,
          }}
        />
      )}
    </div>
  );
}
