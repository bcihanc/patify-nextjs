'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { setReleaseGate } from '@/lib/admin/ops-actions';
import type { ReleaseGate } from '@/lib/admin/ops';

// Guardrail (spec §6.7): bu iki değişiklik geri dönüşü zor / canlı uygulamayı kilitler —
// yazarak-onay istiyoruz. İkisi aynı anda tetiklenirse ikisi de ayrı ayrı sorulur.
const MAINTENANCE_WORD = 'BAKIM';
const MIN_BUILD_WORD = 'ONAYLA';

export function ReleaseGateEditor({ gate }: { gate: ReleaseGate }) {
  const [open, setOpen] = useState(false);
  const [minBuild, setMinBuild] = useState(String(gate.minBuildNumber));
  const [recommendedBuild, setRecommendedBuild] = useState(String(gate.recommendedBuild));
  const [maintenance, setMaintenance] = useState(gate.maintenance);
  const [messageTr, setMessageTr] = useState(gate.messageTr ?? '');
  const [messageEn, setMessageEn] = useState(gate.messageEn ?? '');
  const [maintenanceConfirm, setMaintenanceConfirm] = useState('');
  const [minBuildConfirm, setMinBuildConfirm] = useState('');
  const [pending, startTransition] = useTransition();

  const minBuildNum = Number(minBuild);
  const recommendedBuildNum = Number(recommendedBuild);
  const fieldsValid = minBuild.trim() !== '' && recommendedBuild.trim() !== ''
    && Number.isFinite(minBuildNum) && Number.isFinite(recommendedBuildNum);

  const turningMaintenanceOn = maintenance && !gate.maintenance;
  const raisingMinBuild = Number.isFinite(minBuildNum) && minBuildNum > gate.minBuildNumber;

  const confirmValid = (!turningMaintenanceOn || maintenanceConfirm === MAINTENANCE_WORD)
    && (!raisingMinBuild || minBuildConfirm === MIN_BUILD_WORD);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { setMaintenanceConfirm(''); setMinBuildConfirm(''); }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">Düzenle</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{gate.platform === 'ios' ? 'iOS' : 'Android'} release gate</AlertDialogTitle>
          <AlertDialogDescription>
            Kısıt: min/önerilen build, mağazadaki güncel build&apos;i (
            <span className="font-semibold tabular-nums">{gate.latestStoreBuild}</span>) geçemez — RPC bunu
            reddeder.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`min-build-${gate.platform}`}>Min build</Label>
              <Input
                id={`min-build-${gate.platform}`} type="number" min={1}
                value={minBuild} onChange={(e) => setMinBuild(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rec-build-${gate.platform}`}>Önerilen build</Label>
              <Input
                id={`rec-build-${gate.platform}`} type="number" min={1}
                value={recommendedBuild} onChange={(e) => setRecommendedBuild(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`maintenance-${gate.platform}`} checked={maintenance}
              onCheckedChange={(v) => setMaintenance(v === true)}
            />
            <Label htmlFor={`maintenance-${gate.platform}`}>Bakım modu</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`msg-tr-${gate.platform}`}>Mesaj (TR)</Label>
            <Input id={`msg-tr-${gate.platform}`} value={messageTr} onChange={(e) => setMessageTr(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`msg-en-${gate.platform}`}>Mesaj (EN)</Label>
            <Input id={`msg-en-${gate.platform}`} value={messageEn} onChange={(e) => setMessageEn(e.target.value)} />
          </div>

          {turningMaintenanceOn && (
            <div className="space-y-1.5 rounded-md border border-destructive/50 bg-destructive/5 p-2.5">
              <Label htmlFor={`confirm-maintenance-${gate.platform}`}>
                Bakım modunu AÇIYORSUN — canlı uygulamayı kilitler. Onay için &quot;{MAINTENANCE_WORD}&quot; yaz.
              </Label>
              <Input
                id={`confirm-maintenance-${gate.platform}`}
                value={maintenanceConfirm} onChange={(e) => setMaintenanceConfirm(e.target.value)}
              />
            </div>
          )}

          {raisingMinBuild && (
            <div className="space-y-1.5 rounded-md border border-destructive/50 bg-destructive/5 p-2.5">
              <Label htmlFor={`confirm-minbuild-${gate.platform}`}>
                Min build&apos;i {gate.minBuildNumber} → {minBuildNum} yükseltiyorsun — bunun altındaki sürümler
                uygulamayı kullanamaz. Onay için &quot;{MIN_BUILD_WORD}&quot; yaz.
              </Label>
              <Input
                id={`confirm-minbuild-${gate.platform}`}
                value={minBuildConfirm} onChange={(e) => setMinBuildConfirm(e.target.value)}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <Button
            disabled={!fieldsValid || !confirmValid || pending}
            onClick={() => startTransition(async () => {
              const result = await setReleaseGate({
                platform: gate.platform,
                minBuild: minBuildNum,
                recommendedBuild: recommendedBuildNum,
                maintenance,
                messageTr,
                messageEn,
              });
              if ('error' in result) { toast.error(result.error); return; }
              toast.success('Release gate güncellendi.');
              setOpen(false);
            })}
          >
            Kaydet
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
