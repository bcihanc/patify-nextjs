'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { setFeedbackStatus } from '@/lib/admin/feedback-actions';
import { FEEDBACK_STATUS_LABELS, type FeedbackStatus } from '@/lib/admin/feedback-types';

const STATUS_ORDER: FeedbackStatus[] = ['new', 'in_review', 'closed'];

export function FeedbackStatusSelect({ id, status }: { id: string; status: FeedbackStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => startTransition(async () => {
        const result = await setFeedbackStatus(id, next as FeedbackStatus);
        if ('error' in result) toast.error(result.error);
        else toast.success('Durum güncellendi.');
      })}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
