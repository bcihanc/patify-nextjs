import { needsConsentReprompt, type ConsentState } from '@/lib/consent';

export type GateInput = {
  username: string | null;
  consent: ConsentState;
  pathname: string;
};

// '/profile/delete' must stay reachable regardless of gate state — it's the
// "Hesabı sil" exit linked from the /accept-consent wall itself (Task 14),
// so leaving it gated would loop a consent-reprompted user straight back to
// /accept-consent.
const GATE_EXEMPT = [
  '/complete-profile',
  '/accept-consent',
  '/reset-password',
  '/home/reset-password',
  '/profile/delete',
];

export function resolveGateRedirect(input: GateInput): string | null {
  const { username, consent, pathname } = input;
  const exempt = GATE_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (exempt) return null;
  if (username == null) return '/complete-profile';
  if (needsConsentReprompt(consent)) return '/accept-consent';
  return null;
}
