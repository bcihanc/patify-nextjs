import { createClient } from '@/lib/supabase/server';
import type { CurrentUserProfile } from './types';

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_private').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  // A brand-new SSO user may have no profile row yet → treat as username=null.
  return {
    ...(profile ?? ({ id: user.id, username: null } as never)),
    id: user.id,
    username: profile?.username ?? null,
    phone: priv?.phone ?? null,
    consentAcceptedAt: priv?.consent_accepted_at ?? null,
    tosVersion: priv?.tos_version ?? null,
    ppVersion: priv?.pp_version ?? null,
    birthDate: priv?.birth_date ?? null,
    homeCity: priv?.home_city ?? null,
    homeDistrict: priv?.home_district ?? null,
    analyticsConsentAt: priv?.analytics_consent_at ?? null,
  } as CurrentUserProfile;
}
