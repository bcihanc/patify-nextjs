import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { browseLostFound } from '@/lib/lost-found/read';
import { EMPTY_LF_FILTERS } from '@/lib/lost-found/types';
import { LfListingCard } from '@/components/lost-found/lf-listing-card';

export default async function MyListingsPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  const listings = await browseLostFound(EMPTY_LF_FILTERS, 0, me.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <div className="mb-4 flex items-center justify-between px-2">
        <h1 className="text-xl font-bold">İlanlarım</h1>
        <Link
          href="/lost-found/create"
          className="text-sm font-medium text-primary hover:underline"
        >
          İlan ver
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="px-2 py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Henüz ilanın yok.</p>
          <Link
            href="/lost-found/create"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            İlan ver
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {listings.map((listing) => (
            <LfListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
