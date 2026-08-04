import Link from 'next/link';
import { Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browseLostFound } from '@/lib/lost-found/read';
import { EMPTY_LF_FILTERS } from '@/lib/lost-found/types';
import { BrowseList } from './browse-list';

// Filtre entegrasyonu Task 6'da bağlanır — bu sayfa şimdilik filtresiz ilk sayfa getirir.
export default async function LostFoundPage() {
  const firstPage = await browseLostFound(EMPTY_LF_FILTERS, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kayıp & Bulundu</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/lost-found/map">
              <Map className="mr-1.5 h-4 w-4" />
              Harita
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/lost-found/create">
              <Plus className="mr-1.5 h-4 w-4" />
              İlan ver
            </Link>
          </Button>
        </div>
      </div>
      <BrowseList initial={firstPage} />
    </div>
  );
}
