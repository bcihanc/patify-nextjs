'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NorthStarPoint } from '@/lib/admin/metrics';

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

// Tooltip her zaman pay/payda gösterir — spec §6.4 "n<30'da oranın yanında pay/payda" kuralı.
function NorthStarTooltip({ active, payload }: { active?: boolean; payload?: { payload: NorthStarPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-md">
      <div className="font-medium">{formatDay(p.day)}</div>
      <div>{p.rate != null ? `%${(p.rate * 100).toFixed(1)}` : '—'}</div>
      <div className="text-muted-foreground">
        n={p.responded}/{p.total}
        {p.total < 30 && <span className="ml-1 text-amber-600">(n&lt;30)</span>}
      </div>
    </div>
  );
}

export function NorthStarTrendChart({ data }: { data: NorthStarPoint[] }) {
  return (
    <div className="h-64 w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%" minWidth={480}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => `%${Math.round(v * 100)}`} width={44} tick={{ fontSize: 11 }} />
          <Tooltip content={<NorthStarTooltip />} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
