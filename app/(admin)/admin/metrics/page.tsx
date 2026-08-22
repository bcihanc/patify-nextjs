import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAdoptionFunnel,
  getContentHealth,
  getDeadFeature30d,
  getDeadFeature90d,
  getLostFoundFunnel,
  getNorthStarTrend,
  getRetentionTrend,
  getSignupFunnel,
} from '@/lib/admin/metrics';
import { NorthStarTrendChart } from './_components/north-star-trend-chart';
import { RetentionTrendChart } from './_components/retention-trend-chart';
import { FunnelBars } from './_components/funnel-bars';
import { ContentHealthTable } from './_components/content-health-table';

// BI dashboard'ı — spec §6.4. Tüm kaynak metrics_daily/admin RPC'leri; boş seri
// "veri yok" gösterir (hataysa read katmanı zaten throw ediyor, fail loud).
export default async function AdminMetricsPage() {
  const [northStar, retention, signupFunnel, adoptionFunnel, lostFoundFunnel, deadFeature30d, deadFeature90d, contentHealth] =
    await Promise.all([
      getNorthStarTrend(60),
      getRetentionTrend(60),
      getSignupFunnel(),
      getAdoptionFunnel(),
      getLostFoundFunnel(),
      getDeadFeature30d(),
      getDeadFeature90d(),
      getContentHealth(),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Metrikler</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">⭐ North Star trendi — 48s içinde yanıt (60g)</CardTitle>
        </CardHeader>
        <CardContent>
          {northStar.length === 0 ? (
            <p className="text-sm text-muted-foreground">Veri yok.</p>
          ) : (
            <NorthStarTrendChart data={northStar} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retention (60g)</CardTitle>
        </CardHeader>
        <CardContent>
          {retention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Veri yok.</p>
          ) : (
            <RetentionTrendChart data={retention} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kayıt hunisi</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelBars data={signupFunnel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sahiplendirme hunisi</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelBars data={adoptionFunnel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kayıp-Bulundu hunisi</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelBars data={lostFoundFunnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ölü özellikler — 30g aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {deadFeature30d.length === 0 ? (
              <p className="text-sm text-muted-foreground">Veri yok.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deadFeature30d.map((f) => (
                  <li key={f.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">{f.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ölü özellikler — 90g aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {deadFeature90d.length === 0 ? (
              <p className="text-sm text-muted-foreground">Veri yok.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deadFeature90d.map((f) => (
                  <li key={f.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">{f.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">İçerik sağlığı</h2>
        {contentHealth.length === 0 ? (
          <p className="text-sm text-muted-foreground">Veri yok.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {contentHealth.map((group) => (
              <ContentHealthTable key={group.surface} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
