import { Badge } from '@/components/ui/badge';
import { EMERGENCY_KIND_LABELS, type EmergencyKind } from '@/lib/emergency/types';

// yarali → warning (amber, injured but not necessarily life-threatening).
// tehlikede/istismar → destructive (red, urgent/severe). olu → muted (neutral,
// already a certainty rather than an actionable warning).
const KIND_CLASSES: Record<EmergencyKind, string> = {
  yarali: 'border-transparent bg-warning text-white',
  tehlikede: 'border-transparent bg-destructive text-destructive-foreground',
  istismar: 'border-transparent bg-destructive text-destructive-foreground',
  olu: 'border-transparent bg-muted text-muted-foreground',
};

export function EmergencyKindBadge({ kind }: { kind: EmergencyKind }) {
  return (
    <Badge variant="outline" className={KIND_CLASSES[kind]}>
      {EMERGENCY_KIND_LABELS[kind]}
    </Badge>
  );
}
