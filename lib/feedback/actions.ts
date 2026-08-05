'use server';

import { createClient } from '@/lib/supabase/server';
import type { FeedbackCategory } from './types';

type Result = { ok: true } | { error: string };

const RATE_LIMIT_SENTINEL = 'feedback_create_rate_limit';

export async function submitFeedbackAction(
  category: FeedbackCategory,
  message: string,
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };

  const trimmed = message.trim();
  if (!trimmed) return { error: 'Mesaj boş olamaz.' };

  // Açık kolon listesi — id/user_id/status/created_at server-controlled
  // (column GRANT + defaults, mobile buildFeedbackInsert ile aynı desen).
  // .select('*') YASAK.
  const { error } = await supabase
    .from('feedback')
    .insert({ category, message: trimmed, platform: 'web' });

  if (error) {
    if (error.message.includes(RATE_LIMIT_SENTINEL)) {
      return { error: 'Kısa sürede çok fazla geri bildirim gönderdin, biraz sonra tekrar dene.' };
    }
    console.error('submitFeedbackAction:', error.message);
    return { error: 'Geri bildirim gönderilemedi, tekrar dene.' };
  }

  return { ok: true };
}
