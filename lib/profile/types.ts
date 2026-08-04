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

// Başka bir kullanıcının GÖRÜNÜR profili — asla owner-only PII (user_private) içermez.
export type PublicUserProfile = Pick<
  ProfileRow,
  | 'id'
  | 'username'
  | 'bio'
  | 'profile_photo'
  | 'x_url'
  | 'instagram_url'
  | 'telegram_url'
  | 'tiktok_url'
  | 'facebook_url'
>;

// Takipçi/takip listelerinde satır için hafif özet.
export type PublicUserSummary = Pick<ProfileRow, 'id' | 'username' | 'profile_photo'>;

export type FollowCounts = { followers: number; following: number };
