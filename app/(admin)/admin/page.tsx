import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOverview } from '@/lib/admin/overview';
import { StatCard } from './_components/stat-card';

function formatPercent(rate: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 1 }).format(rate);
}

// Varyant A: iş kuyruğu önce (spec §6.1). Her kart "ne oldu · hangi eşik aşıldı ·
// şimdi nereye tıkla" sorusuna cevap verir — bkz. task-3-brief.md.
export default async function AdminOverviewPage() {
  const o = await getOverview();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Genel Bakış</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Açık rapor" value={o.openReports} href="/admin/moderation" tone="red" />
        <StatCard label="SLA ihlali (24s+ incelenmemiş)" value={o.slaBreaches} href="/admin/moderation" tone="red" />
        <StatCard label="Kritik acil (6s+ üstlenilmemiş)" value={o.criticalEmergencies} tone="amber" />
        <StatCard label="Yaşlı kayıp ilanı (30g+)" value={o.agingLostFound} />
        <StatCard label="Yaşlı sahiplenme ilanı (30g+)" value={o.agingAdoptions} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⭐ 48 saatte yanıt (North Star)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Asla çıplak %: pay/payda her zaman görünür, oran yanına eklenir. */}
            <div className="text-3xl font-semibold tabular-nums">
              {o.nsResponded} / {o.nsTotal}
              {o.nsRate != null && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({formatPercent(o.nsRate)})
                </span>
              )}
            </div>
            {o.nsRate == null && (
              <p className="text-sm text-muted-foreground">Henüz oran hesaplanmadı (snapshot yok).</p>
            )}
            {o.nsTotal < 30 && (
              <p className="text-xs text-amber-600">n&lt;30 — oranı temkinli oku.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🐾 Bu hafta çözülen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div>
              Kayıp-bulundu: <span className="font-semibold tabular-nums">{o.resolvedLf7d}</span>
              <span className="ml-1 text-muted-foreground">(Patify ile: {o.resolvedLfViaPatify7d})</span>
            </div>
            <div>
              Acil durum: <span className="font-semibold tabular-nums">{o.resolvedEmergency7d}</span>
            </div>
            <div>
              Toplam sahiplenme: <span className="font-semibold tabular-nums">{o.adoptedTotal}</span>
              {/* adopted_at yok → point-in-time, "bu hafta" değil — spec §6.4 uyarısı. */}
              <span className="ml-1 text-xs text-muted-foreground">(tüm zamanlar, bu hafta değil)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Yeni kayıt (7g)" value={o.signups7d} />
        <StatCard label="Aktif kullanıcı (30g)" value={o.activeUsers30d} />
      </div>
    </div>
  );
}
