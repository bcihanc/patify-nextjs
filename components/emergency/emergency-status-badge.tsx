import { Badge } from '@/components/ui/badge';
import { EMERGENCY_STATUS_LABELS, type EmergencyStatus } from '@/lib/emergency/types';

// acik → primary/accent (active, needs attention). ustlenildi → info (blue,
// someone's on it). cozuldu → success (green). pasif → muted (neutral/inactive).
const STATUS_CLASSES: Record<EmergencyStatus, string> = {
  acik: 'border-transparent bg-primary text-primary-foreground',
  ustlenildi: 'border-transparent bg-blue-500 text-white',
  cozuldu: 'border-transparent bg-success text-white',
  pasif: 'border-transparent bg-muted text-muted-foreground',
};

export function EmergencyStatusBadge({ status }: { status: EmergencyStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {EMERGENCY_STATUS_LABELS[status]}
    </Badge>
  );
}
