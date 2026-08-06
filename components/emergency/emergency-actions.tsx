'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheckBig, HandHelping } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageUserButton } from '@/components/chats/message-user-button';
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
// case isn't already resolved. DM CTA only appears once claimed, between the
// reporter and the claimer (mirrors mobile's _onDmPressed gating).
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

  const canClaim =
    currentUserId != null &&
    status === 'acik' &&
    claimedBy == null &&
    reporterUserId !== currentUserId;
  const canResolve = currentUserId != null && (isReporter || isClaimer) && status !== 'cozuldu';

  // reporter↔claimer only, and only once the case has been claimed.
  const dmTargetId = isReporter ? claimedBy : isClaimer ? reporterUserId : null;
  const showDm = currentUserId != null && claimedBy != null && dmTargetId != null;

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

  if (!canClaim && !canResolve && !showDm) return null;

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
            <CircleCheckBig className="mr-1.5 h-4 w-4" aria-hidden />
            Çözüldü
          </Button>
        )}
        {showDm && currentUserId != null && dmTargetId != null && (
          <MessageUserButton targetUserId={dmTargetId} currentUserId={currentUserId} />
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
