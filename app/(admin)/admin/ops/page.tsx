import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFlags, getReleaseGate } from '@/lib/admin/ops';
import { FlagRow } from './_components/flag-row';
import { ReleaseGateEditor } from './_components/release-gate-editor';

const PLATFORM_LABELS: Record<string, string> = { ios: 'iOS', android: 'Android' };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminOpsPage() {
  const [flags, releaseGate] = await Promise.all([getFlags(), getReleaseGate()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ops</h1>
      <p className="text-sm text-muted-foreground">
        Bazı gating Firebase Remote Config&apos;de; bu panel onu yönetmez — yalnızca aşağıdaki feature
        flag&apos;leri ve release gate&apos;i kapsar.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Flag&apos;ler</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Flag yok.</p>
          ) : (
            flags.map((flag) => <FlagRow key={flag.key} flag={flag} />)
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {releaseGate.map((gate) => (
          <Card key={gate.platform}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {PLATFORM_LABELS[gate.platform] ?? gate.platform} release gate
              </CardTitle>
              <ReleaseGateEditor key={`${gate.platform}-${gate.updatedAt}`} gate={gate} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {gate.maintenance && <Badge variant="destructive">Bakım modu AÇIK</Badge>}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Min build</div>
                  <div className="tabular-nums">{gate.minBuildNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Önerilen build</div>
                  <div className="tabular-nums">{gate.recommendedBuild}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Mağaza güncel build (salt-okunur)</div>
                  <div className="tabular-nums">{gate.latestStoreBuild}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Güncellenme</div>
                  <div>{formatDateTime(gate.updatedAt)}</div>
                </div>
              </div>
              {gate.messageTr && <p className="text-muted-foreground">TR: {gate.messageTr}</p>}
              {gate.messageEn && <p className="text-muted-foreground">EN: {gate.messageEn}</p>}
              <p className="text-xs text-muted-foreground">
                Kısıt: min/önerilen build ≤ mağaza güncel build (={gate.latestStoreBuild}).
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
