import type { Database } from '@/database.types';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type PrivateRow = Database['public']['Tables']['user_private']['Row'];

export type CurrentUserProfile = ProfileRow & {
  // owner-only private fields (null when the row is absent)
  phone: PrivateRow['phone'];
  consentAcceptedAt: PrivateRow['consent_accepted_at'];
  tosVersion: PrivateRow['tos_version'];
  ppVersion: PrivateRow['pp_version'];
  birthDate: PrivateRow['birth_date'];
  homeCity: PrivateRow['home_city'];
  homeDistrict: PrivateRow['home_district'];
  analyticsConsentAt: PrivateRow['analytics_consent_at'];
};
