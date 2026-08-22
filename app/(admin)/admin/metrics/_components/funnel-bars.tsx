import type { StageValue } from '@/lib/admin/metrics';

// Küçük yatay bar/liste — recharts gerekmez, funnel'ın en son günkü aşama değerlerini gösterir.
export function FunnelBars({ data }: { data: StageValue[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Veri yok.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.stage} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{d.stage}</span>
            <span className="font-medium tabular-nums">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-[var(--color-chart-1)]"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
