import { redirect } from 'next/navigation';
import { User } from 'lucide-react';
import { unblockUserAction } from '@/app/actions';
import { FormMessage, Message } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { avatarUrl } from '@/lib/storage/avatar';
import { createClient } from '@/lib/supabase/server';

// PostgREST needs a hint to disambiguate: user_blockings has two FKs into
// user_profiles (user_id, blocked_user_id), so embedding by bare column name
// (`blocked_user_id(...)`) picks the blocked_user_id relationship — same
// pattern Supabase docs use for self-referencing tables.
type BlockedRow = {
  blocked_user_id: string;
  blocked: { username: string; profile_photo: string | null } | null;
};

export default async function BlockedUsersPage(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_blockings')
    .select('blocked_user_id, blocked:blocked_user_id(username, profile_photo)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .returns<BlockedRow[]>();

  if (error) {
    console.error('BlockedUsersPage:', error.message);
  }
  const blocked = data ?? [];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Engellenen kullanıcılar</h1>

      <FormMessage message={searchParams} />

      {blocked.length === 0 ? (
        <p className="text-sm text-muted-foreground">Engellenen kullanıcı yok</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {blocked.map((row) => (
            <li key={row.blocked_user_id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                {row.blocked?.profile_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet
                  <img
                    src={avatarUrl(row.blocked.profile_photo)}
                    alt=""
                    className="h-10 w-10 rounded-full border border-border bg-secondary object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <span className="text-sm font-medium">
                  {row.blocked?.username ?? 'Bilinmeyen kullanıcı'}
                </span>
              </div>
              <form>
                <input type="hidden" name="blockedUserId" value={row.blocked_user_id} />
                <SubmitButton formAction={unblockUserAction} variant="outline" size="sm">
                  Engeli kaldır
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
