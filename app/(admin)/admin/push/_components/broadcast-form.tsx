'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { broadcast } from '@/lib/admin/push-actions';

// Geri alınamaz, gerçek kullanıcılara gider → yazarak-onay.
const CONFIRM_WORD = 'GONDER';

export function BroadcastForm() {
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const target = city.trim() === '' ? 'Tüm kullanıcılar' : city.trim();
  const fieldsValid = title.trim() !== '' && body.trim() !== '';
  const confirmValid = confirm === CONFIRM_WORD;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="bc-city">Şehir</Label>
        <Input
          id="bc-city" value={city} onChange={(e) => setCity(e.target.value)}
          placeholder="Boş bırak = tüm kullanıcılar"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-title">Başlık</Label>
        <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-body">Mesaj</Label>
        <Input id="bc-body" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirm(''); }}>
        <AlertDialogTrigger asChild>
          <Button disabled={!fieldsValid}>Gönder</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu duyuru gönder</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{target}</span>&apos;a <span className="font-semibold">uygulama-içi</span>{' '}
              bildirim gider — geri alınamaz. Bu telefon push&apos;u DEĞİL. Onaylamak için &quot;{CONFIRM_WORD}&quot; yaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="bc-confirm">Onay</Label>
            <Input id="bc-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={CONFIRM_WORD} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <Button
              disabled={!confirmValid || pending}
              onClick={() => startTransition(async () => {
                const res = await broadcast(city.trim() === '' ? null : city.trim(), title, body);
                if ('error' in res) { toast.error(res.error); return; }
                toast.success(`${res.count} kullanıcıya gönderildi.`);
                setTitle(''); setBody(''); setConfirm(''); setOpen(false);
              })}
            >
              Gönder
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
