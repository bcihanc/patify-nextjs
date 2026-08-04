'use server';

import { createClient } from '@/lib/supabase/server';
import type { ReportType, SupabaseEntity } from './types';

type Result = { ok: true } | { error: string };

export async function reportAction(
  entity: SupabaseEntity,
  entityId: string,
  type: ReportType,
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('reports')
    .insert({
      entity,
      entity_id: entityId,
      type,
      user_id: user.id,
    });

  if (error) {
    console.error('reportAction:', error.message);
    return { error: 'Şikayet gönderilemedi, tekrar dene.' };
  }

  return { ok: true };
}

export async function hasReportedAction(
  entity: SupabaseEntity,
  entityId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('reports')
    .select('id')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
