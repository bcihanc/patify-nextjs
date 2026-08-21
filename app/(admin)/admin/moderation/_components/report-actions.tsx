'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { dismissReport, hideContent, warnUser } from '@/lib/admin/moderation-actions';
import { banUser } from '@/lib/admin/ban';
import type { ReportQueueItem } from '@/lib/admin/moderation';

type ActionResult = { ok: true } | { error: string };

function reportResult(result: ActionResult, successMessage: string): boolean {
  if ('error' in result) { toast.error(result.error); return false; }
  toast.success(successMessage);
  return true;
}

// Dismiss/Uyar ortak şekli: serbest metin zorunlu, Dialog içinde.
function TextPromptAction({
  triggerLabel, title, fieldLabel, submitLabel, disabled,
  onSubmit,
}: {
  triggerLabel: string;
  title: string;
  fieldLabel: string;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (text: string) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="prompt-text">{fieldLabel}</Label>
          <Input id="prompt-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            disabled={!text.trim() || pending}
            onClick={() => startTransition(async () => {
              const ok = reportResult(await onSubmit(text.trim()), 'İşlem tamamlandı.');
              if (ok) { setOpen(false); setText(''); }
            })}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportActions({ item }: { item: ReportQueueItem }) {
  const { entity, entityId, ownerId, ownerUsername } = item;
  const hideDisabled = entity === 'lost_found_sightings';
  const hasOwner = !!ownerId;

  const [hideReason, setHideReason] = useState('');
  const [hideOpen, setHideOpen] = useState(false);
  const [hidePending, startHideTransition] = useTransition();

  const [banReason, setBanReason] = useState('');
  const [banConfirmText, setBanConfirmText] = useState('');
  const [banDurationHours, setBanDurationHours] = useState('');
  const [banOpen, setBanOpen] = useState(false);
  const [banPending, startBanTransition] = useTransition();

  const banConfirmWord = ownerUsername ?? 'BANLA';

  return (
    <div className="flex flex-wrap gap-2">
      <TextPromptAction
        triggerLabel="Reddet"
        title="Raporu reddet"
        fieldLabel="Gerekçe (zorunlu)"
        submitLabel="Reddet"
        onSubmit={(note) => dismissReport(entity, entityId, note)}
      />

      <AlertDialog open={hideOpen} onOpenChange={setHideOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline" size="sm" disabled={hideDisabled}
            title={hideDisabled ? 'Bu içerik türü gizlenemez.' : undefined}
          >
            Gizle
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İçeriği gizle</AlertDialogTitle>
            <AlertDialogDescription>
              İçerik kullanıcılardan gizlenir (pasif/silinmiş işaretlenir). Geri almak için &quot;Aktifleştir&quot; kullanılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hide-reason">Gerekçe</Label>
            <Input id="hide-reason" value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!hideReason.trim() || hidePending}
              onClick={() => startHideTransition(async () => {
                const ok = reportResult(await hideContent(entity, entityId, hideReason.trim()), 'İçerik gizlendi.');
                if (ok) { setHideOpen(false); setHideReason(''); }
              })}
            >
              Gizle
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TextPromptAction
        triggerLabel="Uyar"
        title="Kullanıcıyı uyar"
        fieldLabel="Mesaj (zorunlu)"
        submitLabel="Uyarıyı gönder"
        disabled={!hasOwner}
        onSubmit={(message) => warnUser(entity, entityId, message)}
      />

      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={!hasOwner}>Banla</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı banla</AlertDialogTitle>
            <AlertDialogDescription>
              Bu geri alınması zor bir işlemdir. Onaylamak için aşağıya{' '}
              <span className="font-semibold">{banConfirmWord}</span> yaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Gerekçe</Label>
              <Input id="ban-reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-duration">Süre (saat, boş = kalıcı)</Label>
              <Input
                id="ban-duration" type="number" min={1} value={banDurationHours}
                onChange={(e) => setBanDurationHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-confirm">Onay için &quot;{banConfirmWord}&quot; yaz</Label>
              <Input id="ban-confirm" value={banConfirmText} onChange={(e) => setBanConfirmText(e.target.value)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!banReason.trim() || banConfirmText !== banConfirmWord || banPending || !ownerId}
              onClick={() => startBanTransition(async () => {
                if (!ownerId) return;
                const hours = banDurationHours.trim() ? Number(banDurationHours) : undefined;
                const ok = reportResult(
                  await banUser(entity, entityId, ownerId, banReason.trim(), hours),
                  'Kullanıcı banlandı.',
                );
                if (ok) {
                  setBanOpen(false); setBanReason(''); setBanConfirmText(''); setBanDurationHours('');
                }
              })}
            >
              Banla
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
