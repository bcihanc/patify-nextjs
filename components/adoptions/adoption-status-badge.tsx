import { Badge } from '@/components/ui/badge';
import { ADOPTION_STATUS_LABELS, type AdoptionStatus } from '@/lib/adoptions/types';

// open → unmarked (no badge, active is the default expectation). closed/pasif
// are both a neutral grey — closed is a happy outcome, not a warning; pasif
// mirrors F3's muted/inactive treatment.
const STATUS_CLASSES: Record<Exclude<AdoptionStatus, 'open'>, string> = {
  closed: 'border-transparent bg-muted text-muted-foreground',
  pasif: 'border-transparent bg-muted text-muted-foreground',
};

export function AdoptionStatusBadge({ status }: { status: AdoptionStatus }) {
  if (status === 'open') return null;
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {ADOPTION_STATUS_LABELS[status]}
    </Badge>
  );
}
