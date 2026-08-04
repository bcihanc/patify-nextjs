import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { listFollowing } from '@/lib/follow/server';
import { UserListRow } from '@/components/user/user-list-row';

export default async function FollowingsPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const following = await listFollowing(me.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-2 px-2 text-xl font-bold">Takip edilenler</h1>
      {following.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          Henüz kimseyi takip etmiyorsun.
        </p>
      ) : (
        <div className="flex flex-col">
          {following.map((u) => (
            <UserListRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
