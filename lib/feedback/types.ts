export type FeedbackCategory = 'bug' | 'suggestion' | 'general';

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Hata',
  suggestion: 'Öneri',
  general: 'Genel',
};
