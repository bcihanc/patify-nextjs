'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatComposer({
  onSend,
  onSendImage,
  disabled,
}: {
  onSend: (text: string) => void;
  onSendImage: (file: File) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Reset the input value after every pick (including a re-pick of the same
  // file, which otherwise wouldn't fire a change event a second time).
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSendImage(file);
    e.target.value = '';
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        aria-label="Görsel ekle"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
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
