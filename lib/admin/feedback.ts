import { createClient } from '@/lib/supabase/server';
import type { FeedbackStatus } from './feedback-types';

// admin_feedback_list() satırı (setof feedback, snake_case). `feedback.category`
// gerçek kullanıcı verisi (text NOT NULL, mobil/web feedback formu dolduruyor —
// lib/feedback/actions.ts) — inbox'ta gösteriliyor (bkz. FEEDBACK_CATEGORY_LABELS).
type FeedbackRow = {
  id: string;
  user_id: string;
  category: string;
  message: string;
  status: FeedbackStatus;
  app_version: string | null;
  platform: string | null;
  os_version: string | null;
  screenshot_path: string | null;
  created_at: string;
};

export type FeedbackItem = {
  id: string;
  userId: string;
  category: string;
  message: string;
  status: FeedbackStatus;
  appVersion: string | null;
  platform: string | null;
  osVersion: string | null;
  screenshotPath: string | null;
  createdAt: string;
};

function mapFeedbackRow(r: FeedbackRow): FeedbackItem {
  return {
    id: r.id,
    userId: r.user_id,
    category: r.category,
    message: r.message,
    status: r.status,
    appVersion: r.app_version,
    platform: r.platform,
    osVersion: r.os_version,
    screenshotPath: r.screenshot_path,
    createdAt: r.created_at,
  };
}

export async function getFeedback(): Promise<FeedbackItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_feedback_list');
  if (error || !data) {
    if (error) console.error('getFeedback:', error.message);
    return [];
  }
  // .returns<T[]>() supabase-js'te setof-feedback dönüşünde sahte "single object to
  // array" tip hatası veriyor — düz cast ile aşılıyor.
  return (data as FeedbackRow[]).map(mapFeedbackRow);
}
