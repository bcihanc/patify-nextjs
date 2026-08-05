import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Settings, Pencil, PawPrint, Heart } from 'lucide-react';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { getFollowCounts } from '@/lib/follow/server';
import { fetchMyTrustProgress } from '@/lib/trust/read';
import { ProfileHeader } from '@/components/user/profile-header';
import { TrustProgressPanel } from '@/components/trust/trust-progress-panel';
import { Button } from '@/components/ui/button';

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  // Own profile needs the full breakdown for the progress panel anyway, so
  // reuse its isTrusted for the header badge instead of a second RPC round
  // trip via fetchTrustFlags.
  const [counts, trustProgress] = await Promise.all([
    getFollowCounts(profile.id),
    fetchMyTrustProgress(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProfileHeader
        profile={profile}
        counts={counts}
        countsHref={{ followers: '/profile/followers', following: '/profile/followings' }}
        trusted={trustProgress.isTrusted}
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
      <div className="pb-4">
        <TrustProgressPanel progress={trustProgress} />
      </div>
      {/* İçerik sekmeleri (ilanlar, sahiplendirmeler) ve kaydettiklerin ilgili
          domain fazlarında (Faz 3/6) eklenecek — bkz. F2 spec §2 deferral. */}
      <div className="space-y-4 pb-6">
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/lost-found/mine">
              <PawPrint className="mr-1.5 h-4 w-4" />
              İlanlarım
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/adoptions/mine">
              <Heart className="mr-1.5 h-4 w-4" />
              Sahiplendirmelerim
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
