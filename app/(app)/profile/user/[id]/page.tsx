import { redirect, notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { getPublicProfile } from '@/lib/profile/public';
import { getFollowCounts, isFollowing, isBlocked } from '@/lib/follow/server';
import { ProfileHeader } from '@/components/user/profile-header';
import { UserProfileActions } from '@/components/user/user-profile-actions';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');
  // Tek doğru kendi-profil yüzeyi /profile; self URL oraya yönlenir.
  if (id === me.id) redirect('/profile');

  const profile = await getPublicProfile(id);
  if (!profile) notFound();

  const [counts, following, blocked] = await Promise.all([
    getFollowCounts(id),
    isFollowing(me.id, id),
    isBlocked(me.id, id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProfileHeader
        profile={profile}
        counts={counts}
        countsHref={null}
        actions={
          <UserProfileActions
            targetUserId={id}
            initialFollowing={following}
            initialBlocked={blocked}
          />
        }
      />
    </div>
  );
}
