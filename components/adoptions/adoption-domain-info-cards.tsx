import type { ReactNode } from 'react';
import { Check, FileText, Heart, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  PERSONALITY_TAG_LABELS,
  type AdoptionListing,
} from '@/lib/adoptions/types';

// Labels mirror the create/edit form's checkbox copy (adoption-form.tsx) so a
// value the owner ticked there reads back identically here.
type BoolField = 'neutered' | 'vaccinated' | 'goodWithKids' | 'goodWithPets';
const HEALTH_BOOL_LABELS: { key: BoolField; label: string }[] = [
  { key: 'neutered', label: 'Kısırlaştırılmış' },
  { key: 'vaccinated', label: 'Aşılı' },
  { key: 'goodWithKids', label: 'Çocuklarla uyumlu' },
  { key: 'goodWithPets', label: 'Diğer hayvanlarla uyumlu' },
];

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

// Read-only detail-page counterpart to the create/edit form's domain fields.
// Only POSITIVE signals render (false/null booleans are omitted — a listing
// shows "kısırlaştırılmış" when true, never "kısırlaştırılmamış"). Each
// section — and the whole component — hides itself when it has nothing to
// show, mirroring the mobile app's AdoptionDomainInfoCards.
export function AdoptionDomainInfoCards({ listing }: { listing: AdoptionListing }) {
  const positiveBools = HEALTH_BOOL_LABELS.filter((b) => listing[b.key] === true);
  const healthNotes = listing.extraInfo?.healthNotes?.trim() || null;
  const hasHealth = positiveBools.length > 0 || !!healthNotes;

  const personalityTags = listing.extraInfo?.personalityTags ?? [];
  const personalityDesc = listing.extraInfo?.personalityDesc?.trim() || null;
  const hasPersonality = personalityTags.length > 0 || !!personalityDesc;

  const adoptionRequirements = listing.extraInfo?.adoptionRequirements?.trim() || null;
  const returnPolicy = listing.extraInfo?.returnPolicy?.trim() || null;
  const hasTerms = !!adoptionRequirements || !!returnPolicy;

  if (!hasHealth && !hasPersonality && !hasTerms) return null;

  return (
    <div className="flex flex-col gap-3">
      {hasHealth && (
        <Section icon={<Heart className="h-4 w-4" aria-hidden />} title="Sağlık & uyum">
          {positiveBools.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {positiveBools.map((b) => (
                <li key={b.key} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {b.label}
                </li>
              ))}
            </ul>
          )}
          {healthNotes && <p className="whitespace-pre-line text-sm text-muted-foreground">{healthNotes}</p>}
        </Section>
      )}

      {hasPersonality && (
        <Section icon={<PawPrint className="h-4 w-4" aria-hidden />} title="Karakter">
          {personalityTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {personalityTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-transparent bg-secondary text-secondary-foreground"
                >
                  {(PERSONALITY_TAG_LABELS as Record<string, string | undefined>)[tag] ?? tag}
                </Badge>
              ))}
            </div>
          )}
          {personalityDesc && <p className="whitespace-pre-line text-sm text-muted-foreground">{personalityDesc}</p>}
        </Section>
      )}

      {hasTerms && (
        <Section icon={<FileText className="h-4 w-4" aria-hidden />} title="Teslim koşulları">
          {adoptionRequirements && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{adoptionRequirements}</p>
          )}
          {returnPolicy && <p className="whitespace-pre-line text-sm text-muted-foreground">{returnPolicy}</p>}
        </Section>
      )}
    </div>
  );
}
