'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');

  // A plain <form> submit covers "Enter submits" for free (default HTML
  // behavior for a single text input + submit button) — no extra keydown
  // handling needed. Empty/whitespace-only is blocked here, not just via
  // the button's disabled state, since Enter still fires a submit event
  // even when the button itself is disabled.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2">
      {/* Task 6: image attach */}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Mesaj yaz..."
        disabled={disabled}
        aria-label="Mesaj"
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!canSend} aria-label="Gönder">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
