import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Calendar, Gift, MapPin, PawPrint } from 'lucide-react';
import { getLostFoundDetail } from '@/lib/lost-found/read';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { createClient } from '@/lib/supabase/server';
import {
  PET_COLOR_LABELS,
  PET_GENDER_LABELS,
  petTypeLabel,
  type LostFoundListing,
} from '@/lib/lost-found/types';
import { LfStatusBadge } from '@/components/lost-found/lf-status-badge';
import { OwnerActions } from '@/components/lost-found/owner-actions';
import { EntityActionMenu } from '@/components/shared/entity-action-menu';
import { MessageUserButton } from '@/components/chats/message-user-button';
import { UserAvatar } from '@/components/user/user-avatar';
import { Badge } from '@/components/ui/badge';

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  // iso is a date-only 'YYYY-MM-DD'
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function colorLabel(c: string | null): string | null {
  if (!c) return null;
  return (PET_COLOR_LABELS as Record<string, string | undefined>)[c] ?? c;
}

function petLine(l: LostFoundListing): string {
  return [
    l.breed,
    petTypeLabel(l.type),
    colorLabel(l.color),
    l.gender ? PET_GENDER_LABELS[l.gender] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default async function LostFoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const listing = await getLostFoundDetail(id);
  if (!listing) notFound();

  const isOwner = listing.userId === me.id;

  // Owner-only, çip numarası ana listing okumasında yok — ayrı hydrate.
  let cipNo: string | null = null;
  if (isOwner) {
    const supabase = await createClient();
    const { data: priv } = await supabase
      .from('lost_found_private')
      .select('cip_no')
      .eq('lost_found_id', id)
      .maybeSingle();
    cipNo = priv?.cip_no ?? null;
  }

  const images = listing.images ?? [];
  const hero = images[0];
  const thumbs = images.slice(1);
  const location = [listing.city, listing.district].filter(Boolean).join(', ');
  const date = formatDate(listing.lostDate);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        {hero ? (
          // Plain <img> on purpose — next/image remotePatterns not configured (F0/F2 idiom).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt={petLine(listing)}
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

      <div className="flex items-center justify-between gap-2">
        <LfStatusBadge status={listing.status} />
        <EntityActionMenu
          entity="lost_found"
          entityId={id}
          isOwner={isOwner}
          currentUserId={me.id}
          shareUrl={`https://patify.net/lost-found/item/${id}`}
          shareText={petLine(listing)}
        />
      </div>

      <h1 className="text-2xl font-bold">{petLine(listing)}</h1>

      <div className="flex flex-col gap-1 text-base">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4" aria-hidden /> {location}
        </span>
        {date && (
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden /> {date}
          </span>
        )}
      </div>

      {listing.description && (
        <p className="whitespace-pre-line text-muted-foreground">{listing.description}</p>
      )}

      {listing.rewardOffered && (
        <Badge className="w-fit gap-1 border-transparent bg-warning text-white">
          <Gift className="h-3 w-3" aria-hidden />
          Ödül veriliyor
          {listing.rewardAmount != null ? ` · ${listing.rewardAmount.toLocaleString('tr-TR')} TL` : ''}
        </Badge>
      )}

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

      {!isOwner && (
        <MessageUserButton
          targetUserId={listing.userId}
          currentUserId={me.id}
          label="İlan sahibine mesaj"
        />
      )}

      {isOwner && (
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Çip/kimlik no</span>
            <Badge variant="outline">Yalnızca sana görünür</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{cipNo ?? 'Girilmemiş'}</p>
        </div>
      )}

      {isOwner && (
        <OwnerActions listing={{ id: listing.id, status: listing.status, images: listing.images }} />
      )}
    </div>
  );
}
