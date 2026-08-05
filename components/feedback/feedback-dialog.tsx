'use client';

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { submitFeedbackAction } from '@/lib/feedback/actions';
import { FEEDBACK_CATEGORY_LABELS, type FeedbackCategory } from '@/lib/feedback/types';

const FEEDBACK_CATEGORIES = Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[];
const MESSAGE_MAX = 2000;

const textareaClass =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Dialog her açıldığında formu temiz başlat — önceki içerik/hata bir
  // sonraki geri bildirime sızmasın.
  useEffect(() => {
    if (open) {
      setCategory('bug');
      setMessage('');
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
    if (!message.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await submitFeedbackAction(category, message);
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
          <>
            {/* Görsel olarak gizli ama Radix'in erişilebilirlik için
                zorunlu tuttuğu başlık — report-dialog.tsx'teki eksik. */}
            <DialogTitle className="sr-only">Geri bildirim gönderildi</DialogTitle>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
              <p className="text-sm font-medium">Teşekkürler, geri bildirimin alındı</p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Geri bildirim gönder</DialogTitle>
              <DialogDescription>Hata, öneri ya da genel görüşünü bizimle paylaş.</DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="Geri bildirim kategorisi" className="flex flex-col gap-1">
              {FEEDBACK_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="feedback-category"
                    value={cat}
                    checked={category === cat}
                    onChange={() => setCategory(cat)}
                    className="h-4 w-4"
                  />
                  {FEEDBACK_CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>

            <textarea
              aria-label="Mesajın"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              maxLength={MESSAGE_MAX}
              rows={4}
              placeholder="Mesajını yaz..."
              className={textareaClass}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" disabled={!message.trim() || pending} onClick={handleSubmit}>
                {pending ? 'Gönderiliyor…' : 'Gönder'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
