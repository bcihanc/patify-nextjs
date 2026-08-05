import { BadgeCheck, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TrustProgress } from '@/lib/trust/types';

function CriterionRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>{label}</span>
      {ok ? (
        <Check className="h-4 w-4 text-success" aria-hidden />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Own-profile only (brief: render on app/(app)/profile/page.tsx alone) —
// full breakdown behind fetchMyTrustProgress(), not for other users' pages.
export function TrustProgressPanel({ progress }: { progress: TrustProgress }) {
  const { isTrusted, ageOk, cleanOk, hasSignal, signals, daysSinceSignup } = progress;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck
            className={cn('h-5 w-5', isTrusted ? 'text-success' : 'text-muted-foreground')}
            aria-hidden
          />
          Güvenilir üye {isTrusted ? '✓' : '✗'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        <CriterionRow ok={ageOk} label="Yeterince eski hesap" />
        <CriterionRow ok={cleanOk} label="Temiz geçmiş" />
        <CriterionRow ok={hasSignal} label="Aktiflik sinyali var" />
        <CriterionRow ok={signals.photo} label="Profil fotoğrafı" />
        <CriterionRow ok={signals.bio} label="Bio" />
        <CountRow label="İlanlar" value={signals.listings} />
        <CountRow label="Kavuşmalar" value={signals.reunions} />
        <CountRow label="Sohbetler" value={signals.chats} />
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
          <span>Kayıttan bu yana</span>
          <span>{daysSinceSignup} gün</span>
        </div>
      </CardContent>
    </Card>
  );
}
