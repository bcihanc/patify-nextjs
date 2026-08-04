// Byte-exact vs mobile `trust_models.dart` (TrustSignals/TrustProgress freezed
// classes) — booleans default false, ints default 0.
export type TrustSignals = { photo: boolean; bio: boolean; listings: number; reunions: number; chats: number };

export type TrustProgress = {
  isTrusted: boolean; ageOk: boolean; cleanOk: boolean; hasSignal: boolean;
  signals: TrustSignals; daysSinceSignup: number;
};
