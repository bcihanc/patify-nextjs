import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import { TrustBadge } from '@/components/trust/trust-badge';
import type { PublicUserSummary } from '@/lib/profile/types';

export function UserListRow({ user, trusted }: { user: PublicUserSummary; trusted?: boolean }) {
  return (
    <Link
      href={`/profile/user/${user.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
    >
      <UserAvatar username={user.username} profilePhoto={user.profile_photo} size={40} />
      <div className="flex items-center gap-2 font-medium">
        {user.username ?? '-'}
        <TrustBadge trusted={trusted ?? false} />
      </div>
    </Link>
  );
}
