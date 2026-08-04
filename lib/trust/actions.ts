'use server';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TRUST_PROGRESS, fetchMyTrustProgress } from './read';
import type { TrustProgress } from './types';

export async function myTrustProgressAction(): Promise<TrustProgress> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_TRUST_PROGRESS;
  return fetchMyTrustProgress();
}
