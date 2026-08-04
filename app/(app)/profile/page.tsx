import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Settings, Pencil, PawPrint } from 'lucide-react';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { getFollowCounts } from '@/lib/follow/server';
import { ProfileHeader } from '@/components/user/profile-header';
import { Button } from '@/components/ui/button';

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  const counts = await getFollowCounts(profile.id);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProfileHeader
        profile={profile}
        counts={counts}
        countsHref={{ followers: '/profile/followers', following: '/profile/followings' }}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/profile/edit">
                <Pencil className="mr-1.5 h-4 w-4" />
                Düzenle
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile/settings">
                <Settings className="mr-1.5 h-4 w-4" />
                Ayarlar
              </Link>
            </Button>
          </div>
        }
      />
      {/* İçerik sekmeleri (ilanlar, sahiplendirmeler) ve kaydettiklerin ilgili
          domain fazlarında (Faz 3/6) eklenecek — bkz. F2 spec §2 deferral. */}
      <div className="space-y-4 pb-6">
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/lost-found/mine">
              <PawPrint className="mr-1.5 h-4 w-4" />
              İlanlarım
            </Link>
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Kaydettiklerin yakında.
        </p>
      </div>
    </div>
  );
}
