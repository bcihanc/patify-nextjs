'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '@/lib/admin/metrics';

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

export function RetentionTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%" minWidth={480}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => `%${Math.round(v * 100)}`} width={44} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(day) => formatDay(String(day))}
            formatter={(value) => [`%${(Number(value) * 100).toFixed(1)}`, 'Retention']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-2)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
