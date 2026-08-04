import Link from 'next/link';
import { Gift, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LfStatusBadge } from './lf-status-badge';
import { petTypeLabel, type LostFoundListing } from '@/lib/lost-found/types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isOld(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > THIRTY_DAYS_MS;
}

export function LfListingCard({ listing }: { listing: LostFoundListing }) {
  const photo = listing.images?.[0] ?? null;
  const title = listing.breed ?? petTypeLabel(listing.type);
  const location = [listing.city, listing.district].filter(Boolean).join(', ');
  const distanceKm = listing.distMeters != null ? `${Math.round(listing.distMeters / 1000)} km` : null;
  const showReward = listing.status === 'kayip' && listing.rewardOffered;

  return (
    <Link
      href={`/lost-found/${listing.id}`}
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
          <LfStatusBadge status={listing.status} />
        </div>
        {showReward && (
          <div className="absolute right-2 top-2">
            <Badge className="gap-1 border-transparent bg-warning text-white" variant="outline">
              <Gift className="h-3 w-3" aria-hidden />
              Ödül
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {location}
          {distanceKm ? ` · ${distanceKm}` : ''}
          {isOld(listing.createdAt) ? ' · eski' : ''}
        </p>
      </div>
    </Link>
  );
}
