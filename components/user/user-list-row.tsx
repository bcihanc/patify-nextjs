import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import type { PublicUserSummary } from '@/lib/profile/types';

export function UserListRow({ user }: { user: PublicUserSummary }) {
  return (
    <Link
      href={`/profile/user/${user.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
    >
      <UserAvatar username={user.username} profilePhoto={user.profile_photo} size={40} />
      <span className="font-medium">{user.username ?? '-'}</span>
    </Link>
  );
}
