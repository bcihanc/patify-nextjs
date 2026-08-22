import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatTone = 'red' | 'amber' | 'neutral';

const TONE_CLASS: Record<StatTone, string> = {
  red: 'border-red-500/50 bg-red-500/5',
  amber: 'border-amber-500/50 bg-amber-500/5',
  neutral: '',
};

// Genel Bakış'taki sayı kartı — hem üst uyarı şeridinde hem mini sayılarda kullanılır.
// href verilmezse (ör. henüz filtreli bir liste rotası yokken) statik kart olarak kalır.
export function StatCard({
  label,
  value,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  href?: string;
  tone?: StatTone;
}) {
  const card = (
    <Card className={cn(TONE_CLASS[tone], href && 'transition-colors hover:bg-muted/50')}>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
