import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdoptionStatusBadge } from './adoption-status-badge';
import { PET_GENDER_LABELS, petTypeLabel, type AdoptionListing } from '@/lib/adoptions/types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isStale(lifecycleLastActivityAt: string): boolean {
  return Date.now() - new Date(lifecycleLastActivityAt).getTime() > THIRTY_DAYS_MS;
}

export function AdoptionCard({ listing }: { listing: AdoptionListing }) {
  const photo = listing.images?.[0] ?? null;
  const title = listing.title;
  const typeLine = listing.breed ?? petTypeLabel(listing.type);

  return (
    <Link
      href={`/adoptions/${listing.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:bg-accent"
    >
      <div className="relative aspect-square w-full">
        {photo ? (
          // Plain <img> on purpose — next/image remotePatterns not configured (F0/F2 idiom).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <PawPrint className="h-10 w-10 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <AdoptionStatusBadge status={listing.status} />
        </div>
        {listing.gender && (
          <div className="absolute right-2 top-2">
            <Badge variant="outline" className="border-transparent bg-secondary text-secondary-foreground">
              {PET_GENDER_LABELS[listing.gender]}
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {typeLine}
          {isStale(listing.lifecycleLastActivityAt) ? ' · eski' : ''}
        </p>
      </div>
    </Link>
  );
}
