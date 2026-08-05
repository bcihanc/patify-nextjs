import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// User-surface only (profile header + follower/following rows) — NOT
// listing cards (adoption/emergency/lost-found), which are out of scope
// per Task 5 brief.
export function TrustBadge({ trusted }: { trusted: boolean }) {
  if (!trusted) return null;
  return (
    <Badge className="gap-1 border-transparent bg-success text-white" variant="outline">
      <BadgeCheck className="h-3 w-3" aria-hidden />
      Güvenilir üye
    </Badge>
  );
}
