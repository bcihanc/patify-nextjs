'use server';

// Ayrı dosya (feedback.ts'ten) — aynı gerekçe: moderation-actions.ts'teki not'a bak
// (client'a next/headers'lı reads'in bulaşmasını önlüyor).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';
import type { FeedbackStatus } from './feedback';

type ActionResult = { ok: true } | { error: string };

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_feedback_status', { p_id: id, p_status: status });
  if (error) { console.error('setFeedbackStatus:', error.message); return { error: 'İşlem başarısız, tekrar dene.' }; }
  revalidatePath('/admin/feedback');
  return { ok: true };
}
