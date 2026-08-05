'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { shareOrCopy } from '@/lib/share';
import { hasReportedAction } from '@/lib/reports/actions';
import type { SupabaseEntity } from '@/lib/reports/types';
import { ReportDialog } from './report-dialog';

type EntityActionMenuProps = {
  entity: SupabaseEntity;
  entityId: string;
  isOwner: boolean;
  currentUserId?: string | null;
  shareUrl?: string;
  shareText?: string;
};

export function EntityActionMenu({
  entity,
  entityId,
  isOwner,
  currentUserId,
  shareUrl,
  shareText,
}: EntityActionMenuProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  // Sahibi kendi içeriğini şikayet edemez; oturum yoksa da Şikayet gizlenir
  // (reportAction zaten oturum ister), Paylaş herkese açık kalır.
  const canReport = !isOwner && currentUserId != null;

  async function handleShare() {
    const url = shareUrl ?? window.location.href;
    const result = await shareOrCopy(url, shareText);
    if (result === 'copied') {
      setHint('Bağlantı kopyalandı');
      setTimeout(() => setHint(null), 2500);
    }
  }

  function handleMenuOpenChange(open: boolean) {
    if (!open || !canReport) return;
    // Menüyü asla bloklamayan, en iyi çaba (best-effort) durum kontrolü.
    hasReportedAction(entity, entityId)
      .then(setAlreadyReported)
      .catch(() => {});
  }

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      <DropdownMenu onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Diğer işlemler">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem onSelect={() => void handleShare()}>Paylaş</DropdownMenuItem>
          {canReport && (
            alreadyReported ? (
              <DropdownMenuItem disabled>Şikayet edildi</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>Şikayet et</DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}

      {canReport && (
        <ReportDialog
          entity={entity}
          entityId={entityId}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}
