import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { getEmergencyById } from '@/lib/emergency/read';
import { createClient } from '@/lib/supabase/server';
import { EMERGENCY_KIND_LABELS, petTypeLabel } from '@/lib/emergency/types';
import { EmergencyActions } from '@/components/emergency/emergency-actions';
import { EmergencyKindBadge } from '@/components/emergency/emergency-kind-badge';
import { EmergencyStatusBadge } from '@/components/emergency/emergency-status-badge';
import { EntityActionMenu } from '@/components/shared/entity-action-menu';
import { Button } from '@/components/ui/button';

export default async function EmergencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await getEmergencyById(id);
  if (!item) notFound();

  // (app)/layout.tsx already redirects unauthenticated visitors to
  // /auth/login before this page renders, so `user` is always set here —
  // still read it via getUser() rather than assert, per brief.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const location = [item.city, item.district].filter(Boolean).join(' · ');
  const mapHref = item.lat != null && item.long != null
    ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.long}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      {/* Tek fotoğraf — photoUrl zorunlu alan (lib/emergency/types.ts), placeholder gerekmiyor. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.photoUrl}
        alt={petTypeLabel(item.petType)}
        className="aspect-square w-full rounded-2xl object-cover"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EmergencyKindBadge kind={item.kind} />
          <EmergencyStatusBadge status={item.status} />
        </div>
        <EntityActionMenu
          entity="emergency"
          entityId={item.id}
          isOwner={item.reporterUserId === currentUserId}
          currentUserId={currentUserId}
          shareUrl={`https://patify.net/emergency/${item.id}`}
          shareText={`${EMERGENCY_KIND_LABELS[item.kind]} · ${petTypeLabel(item.petType)}`}
        />
      </div>

      <h1 className="text-2xl font-bold">{petTypeLabel(item.petType)}</h1>

      {location && (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden /> {location}
        </span>
      )}

      {item.description && (
        <p className="whitespace-pre-line text-muted-foreground">{item.description}</p>
      )}

      {mapHref && (
        // Sokak hayvanı — owner-aware maskeleme yok (EmergencyListing yorumu,
        // lib/emergency/types.ts), bu yüzden LF/Adoptions'ın "yaklaşık konum"
        // notu burada YOK: gerçek lat/long doğrudan harita linkine gider.
        <Button asChild variant="outline" size="sm" className="w-fit">
          <a href={mapHref} target="_blank" rel="noopener noreferrer">
            <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
            Haritada gör
          </a>
        </Button>
      )}

      <EmergencyActions
        caseId={item.id}
        status={item.status}
        reporterUserId={item.reporterUserId}
        claimedBy={item.claimedBy}
        currentUserId={currentUserId}
      />
    </div>
  );
}
