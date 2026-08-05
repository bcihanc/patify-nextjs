'use client';

import { useState } from 'react';
import { ChevronRight, MessageCircle, Share2, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { shareOrCopy } from '@/lib/share';

// Real applicationId/store URLs — same source as components/open-in-app-button.tsx.
const IOS_STORE = 'https://apps.apple.com/tr/app/patify/id6478046323';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.bcc.buschat';

// Same row visual language as settings/page.tsx's SettingsRow, but these are
// buttons/dropdown triggers (interactive, not navigation), hence a plain
// className constant here rather than importing that private helper.
const rowClass =
  'flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent';

export function AboutActions() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={rowClass}
        onClick={() => shareOrCopy('https://patify.net/app', 'Patify uygulamasını indir')}
      >
        <span className="flex items-center gap-3">
          <Share2 className="h-4 w-4" />
          Paylaş
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={rowClass}>
            <span className="flex items-center gap-3">
              <Star className="h-4 w-4" />
              Değerlendir
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={IOS_STORE} target="_blank" rel="noopener noreferrer">
              App Store
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer">
              Google Play
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="button" className={rowClass} onClick={() => setFeedbackOpen(true)}>
        <span className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4" />
          Geri bildirim gönder
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
