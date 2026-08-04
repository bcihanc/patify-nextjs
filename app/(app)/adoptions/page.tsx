import Link from 'next/link';
import { Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browseAdoptions } from '@/lib/adoptions/read';
import { EMPTY_ADOPTION_FILTERS } from '@/lib/adoptions/types';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { BrowseList } from './browse-list';

// Server can't read localStorage, so SSR always renders the unfiltered first
// page; the client hydrates any persisted filter snapshot on mount (Task 5).
export default async function AdoptionsPage() {
  const [firstPage, me] = await Promise.all([
    browseAdoptions(EMPTY_ADOPTION_FILTERS, 0),
    getCurrentUserProfile(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sahiplendirme</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/adoptions/map">
              <Map className="mr-1.5 h-4 w-4" />
              Harita
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/adoptions/create">
              <Plus className="mr-1.5 h-4 w-4" />
              İlan ver
            </Link>
          </Button>
        </div>
      </div>
      <BrowseList initial={firstPage} ownerId={me?.id ?? null} />
    </div>
  );
}
