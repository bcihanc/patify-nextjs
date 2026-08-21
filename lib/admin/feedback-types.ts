// Ayrı dosya (feedback.ts/feedback-actions.ts'ten): FEEDBACK_STATUS_LABELS bir
// runtime const — next/headers'a bağımlı olmayan bu dosyadan client component'ler
// güvenle import edebilir (bkz. CLAUDE.md "read.ts/actions.ts ayrı kalmalı" notu,
// aynı sorun value export'lar için burada da geçerli).
export type FeedbackStatus = 'new' | 'in_review' | 'closed';

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Yeni',
  in_review: 'İnceleniyor',
  closed: 'Kapandı',
};
