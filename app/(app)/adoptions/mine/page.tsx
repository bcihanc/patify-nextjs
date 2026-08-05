import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { browseAdoptions } from '@/lib/adoptions/read';
import { EMPTY_ADOPTION_FILTERS } from '@/lib/adoptions/types';
import { AdoptionCard } from '@/components/adoptions/adoption-card';

export default async function MyAdoptionsPage() {
  const me = await requireAuth();

  const listings = await browseAdoptions(EMPTY_ADOPTION_FILTERS, 0, me.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <div className="mb-4 flex items-center justify-between px-2">
        <h1 className="text-xl font-bold">İlanlarım</h1>
        <Link
          href="/adoptions/create"
          className="text-sm font-medium text-primary hover:underline"
        >
          İlan ver
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="px-2 py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Henüz ilanın yok.</p>
          <Link
            href="/adoptions/create"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            İlan ver
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {listings.map((listing) => (
            <AdoptionCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
