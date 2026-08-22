'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { hideContent, reactivateContent } from '@/lib/admin/moderation-actions';

// P1'in hideContent/reactivateContent'i revalidatePath('/admin/moderation') çağırıyor
// (bu sayfaya değil) — router.refresh() ile bu sayfanın server verisini de tazeliyoruz.
type HideableEntity = 'lost_found' | 'adoptions';

export function ContentRowActions({
  entity,
  entityId,
  isPasif,
}: {
  entity: HideableEntity;
  entityId: string;
  isPasif: boolean;
}) {
  const router = useRouter();

  const [hideOpen, setHideOpen] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [hidePending, startHideTransition] = useTransition();

  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivatePending, startReactivateTransition] = useTransition();

  if (isPasif) {
    return (
      <AlertDialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">Tekrar aç</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İçeriği tekrar aç</AlertDialogTitle>
            <AlertDialogDescription>İçerik tekrar kullanıcılara görünür olur.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <Button
              disabled={reactivatePending}
              onClick={() => startReactivateTransition(async () => {
                const result = await reactivateContent(entity, entityId);
                if ('error' in result) { toast.error(result.error); return; }
                toast.success('İçerik tekrar açıldı.');
                setReactivateOpen(false);
                router.refresh();
              })}
            >
              Tekrar aç
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={hideOpen} onOpenChange={setHideOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">Gizle</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>İçeriği gizle</AlertDialogTitle>
          <AlertDialogDescription>İçerik kullanıcılardan gizlenir (pasif işaretlenir).</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`hide-reason-${entityId}`}>Gerekçe</Label>
          <Input
            id={`hide-reason-${entityId}`}
            value={hideReason}
            onChange={(e) => setHideReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!hideReason.trim() || hidePending}
            onClick={() => startHideTransition(async () => {
              const result = await hideContent(entity, entityId, hideReason.trim());
              if ('error' in result) { toast.error(result.error); return; }
              toast.success('İçerik gizlendi.');
              setHideOpen(false);
              setHideReason('');
              router.refresh();
            })}
          >
            Gizle
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
