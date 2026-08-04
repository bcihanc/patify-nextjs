'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, HandHelping } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { claimEmergencyAction, resolveEmergencyAction } from '@/lib/emergency/actions';
import type { EmergencyStatus } from '@/lib/emergency/types';

type EmergencyActionsProps = {
  caseId: string;
  status: EmergencyStatus;
  reporterUserId: string;
  claimedBy: string | null;
  currentUserId: string | null;
};

// Gating mirrors mobile _EmergencyActionsWidget (emergency_detail_page.dart)
// byte-for-byte: canClaim = case is açık + unclaimed + viewer isn't the
// reporter; canResolve = viewer is the reporter or current claimer and the
// case isn't already resolved.
// DEFERRED: DM "Mesaj" CTA → Chats phase (needs findOrCreateDirectRoom + can_dm; not yet on web)
// DEFERRED: Report "..." menu → Moderation phase (needs reports table/UI; not yet on web)
export function EmergencyActions({
  caseId,
  status,
  reporterUserId,
  claimedBy,
  currentUserId,
}: EmergencyActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const isReporter = reporterUserId === currentUserId;
  const isClaimer = claimedBy != null && claimedBy === currentUserId;

  const canClaim = status === 'acik' && claimedBy == null && reporterUserId !== currentUserId;
  const canResolve = (isReporter || isClaimer) && status !== 'cozuldu';

  function handleClaim() {
    setMessage(null);
    startTransition(async () => {
      const result = await claimEmergencyAction(caseId);
      if ('error' in result) {
        setMessage({ text: result.error, isError: true });
        return;
      }
      // claimed === false = başka biri önce üstlendi (race kaybedildi) — hata DEĞİL.
      setMessage({
        text: result.claimed ? 'Vakayı üstlendin' : 'Bu vaka zaten üstlenilmiş',
        isError: false,
      });
      router.refresh();
    });
  }

  function handleResolve() {
    setMessage(null);
    startTransition(async () => {
      const result = await resolveEmergencyAction(caseId);
      if ('error' in result) {
        setMessage({ text: result.error, isError: true });
        return;
      }
      setMessage({
        text: result.resolved ? 'Vaka çözüldü olarak işaretlendi' : 'İşlem çakıştı, tekrar dene',
        isError: false,
      });
      router.refresh();
    });
  }

  if (!canClaim && !canResolve) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canClaim && (
          <Button size="sm" disabled={pending} onClick={handleClaim}>
            <HandHelping className="mr-1.5 h-4 w-4" aria-hidden />
            Üstlen
          </Button>
        )}
        {canResolve && (
          <Button variant="outline" size="sm" disabled={pending} onClick={handleResolve}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
            Çözüldü
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.isError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
