export const TOS_VERSION = '2026-05-23';
export const PP_VERSION = '2026-07-19';

export type ConsentState = {
  consentAcceptedAt: string | null;
  tosVersion: string | null;
  ppVersion: string | null;
};

// Mirrors mobile needsConsentReprompt (router.dart:181-189).
export function needsConsentReprompt(c: ConsentState): boolean {
  return (
    c.consentAcceptedAt == null ||
    c.tosVersion !== TOS_VERSION ||
    c.ppVersion !== PP_VERSION
  );
}
