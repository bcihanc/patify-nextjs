import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { EmergencyKindBadge } from './emergency-kind-badge';
import { EmergencyStatusBadge } from './emergency-status-badge';
import { petTypeLabel, type EmergencyListing } from '@/lib/emergency/types';

export function EmergencyCard({ item }: { item: EmergencyListing }) {
  const title = petTypeLabel(item.petType);
  const location = [item.city, item.district].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/emergency/${item.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:bg-accent"
    >
      <div className="relative aspect-square w-full">
        {item.photoUrl ? (
          // Plain <img> on purpose — next/image remotePatterns not configured (F0/F2 idiom).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photoUrl} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <PawPrint className="h-10 w-10 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <EmergencyKindBadge kind={item.kind} />
          <EmergencyStatusBadge status={item.status} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate font-semibold">{title}</p>
        {location && <p className="truncate text-sm text-muted-foreground">{location}</p>}
      </div>
    </Link>
  );
}
