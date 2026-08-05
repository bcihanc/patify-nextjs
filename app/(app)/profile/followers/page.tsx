import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { listFollowers } from '@/lib/follow/server';
import { fetchTrustFlags } from '@/lib/trust/read';
import { UserListRow } from '@/components/user/user-list-row';

export default async function FollowersPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const followers = await listFollowers(me.id);
  const trustFlags = await fetchTrustFlags(followers.map((u) => u.id));

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-2 px-2 text-xl font-bold">Takipçiler</h1>
      {followers.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          Henüz takipçin yok.
        </p>
      ) : (
        <div className="flex flex-col">
          {followers.map((u) => (
            <UserListRow key={u.id} user={u} trusted={trustFlags[u.id] ?? false} />
          ))}
        </div>
      )}
    </div>
  );
}
