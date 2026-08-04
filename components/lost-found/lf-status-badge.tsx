import { Badge } from '@/components/ui/badge';
import { LF_STATUS_LABELS, type LfStatus } from '@/lib/lost-found/types';

// kayip → primary (F0 spec §3.3: "lost-urgent = primary", already a warm red/terracotta hue).
// bulundu → success (green). cozuldu/pasif → muted (grey, inactive).
const STATUS_CLASSES: Record<LfStatus, string> = {
  kayip: 'border-transparent bg-primary text-primary-foreground',
  bulundu: 'border-transparent bg-success text-white',
  cozuldu: 'border-transparent bg-muted text-muted-foreground',
  pasif: 'border-transparent bg-muted text-muted-foreground',
};

export function LfStatusBadge({ status }: { status: LfStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {LF_STATUS_LABELS[status]}
    </Badge>
  );
}
