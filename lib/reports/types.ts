export type SupabaseEntity =
  | 'posts' | 'post_comments' | 'discussion' | 'discussion_answers'
  | 'discussion_answer_comments' | 'adoptions' | 'adoption_comments'
  | 'lost_found' | 'lost_found_sightings' | 'emergency';

export type ReportType =
  | 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity'
  | 'false_information' | 'sale_commercial_content' | 'other';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  spam: 'Spam',
  harassment: 'Taciz',
  hate_speech: 'Nefret söylemi',
  violence: 'Şiddet',
  nudity: 'Müstehcenlik',
  false_information: 'Yanlış bilgi',
  sale_commercial_content: 'Satış-ticari içerik',
  other: 'Diğer',
};
