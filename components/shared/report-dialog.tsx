'use client';

import { useEffect, useState, useTransition } from 'react';
import { CircleCheckBig } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { reportAction } from '@/lib/reports/actions';
import { REPORT_TYPE_LABELS, type ReportType, type SupabaseEntity } from '@/lib/reports/types';

const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS) as ReportType[];

type ReportDialogProps = {
  entity: SupabaseEntity;
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportDialog({ entity, entityId, open, onOpenChange }: ReportDialogProps) {
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Dialog her açıldığında formu temiz başlat — önceki seçim/hata bir
  // sonraki şikayete sızmasın.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  // Başarı durumunu kısaca göster, sonra otomatik kapat.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => onOpenChange(false), 1200);
    return () => clearTimeout(timer);
  }, [success, onOpenChange]);

  function handleSubmit() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await reportAction(entity, entityId, selected);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {success ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            {/* Radix, DialogContent'in her durumda erişilebilir bir başlığı
                olmasını bekler — başarı ekranında görsel başlık yok, sr-only ver. */}
            <DialogTitle className="sr-only">Şikayetin alındı</DialogTitle>
            <CircleCheckBig className="h-8 w-8 text-primary" aria-hidden />
            <p className="text-sm font-medium">Şikayetin alındı</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Şikayet et</DialogTitle>
              <DialogDescription>Bu içeriği neden şikayet ediyorsun?</DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="Şikayet nedeni" className="flex flex-col gap-1">
              {REPORT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="report-type"
                    value={type}
                    checked={selected === type}
                    onChange={() => setSelected(type)}
                    className="h-4 w-4"
                  />
                  {REPORT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" disabled={!selected || pending} onClick={handleSubmit}>
                {pending ? 'Gönderiliyor…' : 'Gönder'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
