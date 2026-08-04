import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import { SocialLinks } from './social-links';
import type { PublicUserProfile, FollowCounts } from '@/lib/profile/types';

function StatCell({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <span className="flex flex-col items-center">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="rounded-md px-3 py-1 transition-colors hover:bg-accent">
      {inner}
    </Link>
  ) : (
    <span className="px-3 py-1">{inner}</span>
  );
}

export function ProfileHeader({
  profile,
  counts,
  countsHref,
  actions,
}: {
  profile: PublicUserProfile;
  counts: FollowCounts;
  countsHref?: { followers: string; following: string } | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <UserAvatar username={profile.username} profilePhoto={profile.profile_photo} size={112} />
      <h1 className="text-xl font-bold">{profile.username ?? '-'}</h1>

      <div className="flex items-center gap-4">
        <StatCell value={counts.following} label="Takip" href={countsHref?.following} />
        <StatCell value={counts.followers} label="Takipçi" href={countsHref?.followers} />
      </div>

      <SocialLinks profile={profile} />

      {profile.bio && (
        <p className="max-w-md text-center text-sm text-muted-foreground">{profile.bio}</p>
      )}

      {actions}
    </div>
  );
}
