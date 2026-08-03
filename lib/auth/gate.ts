import { needsConsentReprompt, type ConsentState } from '@/lib/consent';

export type GateInput = {
  username: string | null;
  consent: ConsentState;
  pathname: string;
};

const GATE_EXEMPT = ['/complete-profile', '/accept-consent', '/reset-password', '/home/reset-password'];

export function resolveGateRedirect(input: GateInput): string | null {
  const { username, consent, pathname } = input;
  const exempt = GATE_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (exempt) return null;
  if (username == null) return '/complete-profile';
  if (needsConsentReprompt(consent)) return '/accept-consent';
  return null;
}
