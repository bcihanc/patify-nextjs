export const TOS_VERSION = '2026-05-23';
export const PP_VERSION = '2026-07-19';

// KVKK age gate — mirrors mobile PatifyValidators.birthDateRequired
// (lib/utils/validators.dart:129-135 in the patify mobile repo): under-13 blocks.
export const MIN_SIGNUP_AGE = 13;

// Latest birth date (YYYY-MM-DD) that still satisfies `minAge` years old as of `now`.
// Used both to cap a date-input's `max` and to validate a submitted birth date.
export function latestBirthDateForAge(minAge: number, now: Date = new Date()): string {
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear() - minAge, now.getUTCMonth(), now.getUTCDate()),
  );
  return cutoff.toISOString().slice(0, 10);
}

// Whether `birthDate` (YYYY-MM-DD) indicates an age >= minAge as of `now`.
export function isAtLeastAge(
  birthDate: string,
  minAge: number,
  now: Date = new Date(),
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate <= latestBirthDateForAge(minAge, now);
}

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
