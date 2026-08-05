'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FollowButton } from './follow-button';
import { BlockButton } from './block-button';
import { MessageUserButton } from '@/components/chats/message-user-button';
import { Button } from '@/components/ui/button';
import { loginWallHref } from '@/lib/auth/next-path';

// Public profildeki aksiyon satırı. Mobil UserFollowOrBlockWidget'in
// trust'sız (Faz 9) sadeleştirilmiş hali. Engellendiğinde takip butonu
// gizlenir — iki buton state'i burada koordine edilir. Mesaj CTA'sı
// hedef===viewer olduğunda kendini gizler (MessageUserButton).
// Guest (currentUserId null): takip butonu login-wall'a yönlenir, engelle
// gizlenir (yazma yetkisi olmayan bir aksiyonu misafire göstermenin anlamı yok).
export function UserProfileActions({
  targetUserId,
  currentUserId,
  initialFollowing,
  initialBlocked,
}: {
  targetUserId: string;
  currentUserId: string | null;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);

  if (currentUserId == null) {
    return (
      <div className="flex items-start justify-center gap-3">
        <Button type="button" asChild>
          <Link href={loginWallHref('/profile/user/' + targetUserId)}>Takip et</Link>
        </Button>
        <MessageUserButton targetUserId={targetUserId} currentUserId={null} />
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center gap-3">
      {!blocked && (
        <FollowButton targetUserId={targetUserId} following={following} onChange={setFollowing} />
      )}
      <BlockButton targetUserId={targetUserId} blocked={blocked} onChange={setBlocked} />
      <MessageUserButton targetUserId={targetUserId} currentUserId={currentUserId} />
    </div>
  );
}
