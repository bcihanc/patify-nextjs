'use client';

import { useState } from 'react';
import { FollowButton } from './follow-button';
import { BlockButton } from './block-button';
import { MessageUserButton } from '@/components/chats/message-user-button';

// Public profildeki aksiyon satırı. Mobil UserFollowOrBlockWidget'in
// trust'sız (Faz 9) sadeleştirilmiş hali. Engellendiğinde takip butonu
// gizlenir — iki buton state'i burada koordine edilir. Mesaj CTA'sı
// hedef===viewer olduğunda kendini gizler (MessageUserButton).
export function UserProfileActions({
  targetUserId,
  currentUserId,
  initialFollowing,
  initialBlocked,
}: {
  targetUserId: string;
  currentUserId: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);

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
