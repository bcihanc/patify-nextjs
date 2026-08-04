'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PartyPopper, Pencil, RotateCcw, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  bumpAdoptionAction,
  deleteAdoptionAction,
  markAdoptedAction,
  reactivateAdoptionAction,
} from '@/lib/adoptions/actions';
import type { AdoptionStatus } from '@/lib/adoptions/types';

type OwnerActionsListing = {
  id: string;
  status: AdoptionStatus;
  adopted: boolean;
  images: string[] | null;
};

// Sahip-only aksiyon satırı — /adoptions/[id]'de yalnızca isOwner true iken render edilir.
// Share/Applications butonu yok (başvurular Faz ertelendi, brief'te açıkça gizli tutulmalı).
export function AdoptionOwnerActions({ listing }: { listing: OwnerActionsListing }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAdoptionAction(listing.id, listing.images ?? undefined);
      if ('error' in result) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      router.push('/adoptions/mine');
    });
  }

  function handleMarkAdopted() {
    setError(null);
    startTransition(async () => {
      const result = await markAdoptedAction(listing.id, true);
      if ('error' in result) { setError(result.error); return; }
      router.refresh();
    });
  }

  function handleBump() {
    setError(null);
    startTransition(async () => {
      const result = await bumpAdoptionAction(listing.id);
      if ('error' in result) { setError(result.error); return; }
      router.refresh();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateAdoptionAction(listing.id);
      if ('error' in result) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/adoptions/${listing.id}/edit`}>
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            Düzenle
          </Link>
        </Button>

        {listing.status === 'open' && !listing.adopted && (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={handleMarkAdopted}>
              <PartyPopper className="mr-1.5 h-4 w-4" aria-hidden />
              Sahiplendirildi olarak işaretle
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={handleBump}>
              <TrendingUp className="mr-1.5 h-4 w-4" aria-hidden />
              Hâlâ sahiplendiriyorum
            </Button>
          </>
        )}

        {listing.status === 'pasif' && (
          <Button variant="outline" size="sm" disabled={pending} onClick={handleReactivate}>
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
            Yeniden yayınla
          </Button>
        )}
      </div>

      {confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 p-3">
          <span className="text-sm">Bu ilanı kalıcı olarak silmek istediğine emin misin?</span>
          <Button variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
            Evet, sil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmingDelete(false)}
          >
            Vazgeç
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmingDelete(true)}
          className="w-fit"
        >
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
          Sil
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
