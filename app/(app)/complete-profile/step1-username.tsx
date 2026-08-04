'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const DEBOUNCE_MS = 400;

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

// Step 1 of the /complete-profile gate: mandatory, focused (no way to skip
// forward without a valid, available username — spec §4.2). Reserved-name
// rejection happens server-side, inside the username_exists RPC.
export function Step1Username({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed === '') {
      setStatus('idle');
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setStatus('invalid');
      return;
    }

    const generation = ++generationRef.current;
    setStatus('checking');

    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .rpc('username_exists', { p_username: trimmed })
        .returns<boolean>();
      if (generation !== generationRef.current) return; // superseded by a newer keystroke
      setStatus(error ? 'error' : data ? 'taken' : 'available');
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [username]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status !== 'available' || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    const supabase = createClient();
    // upsert, not update: email/password signups have no user_profiles row yet
    // (only the SSO oauth callback creates one) — update() on a missing row
    // silently no-ops (PostgREST returns { error: null } for zero matched
    // rows), which would otherwise soft-lock the onboarding wizard.
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, username: username.trim() }, { onConflict: 'id' });
    setSubmitting(false);

    if (error) {
      setSubmitError('Kullanıcı adı kaydedilemedi, tekrar dene.');
      return;
    }
    onDone();
  }

  const canSubmit = status === 'available' && !submitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sana ne diyelim?</h1>
        <p className="text-muted-foreground">
          Bu, Patify&apos;da seni başkalarının çağıracağı isim.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Kullanıcı adı</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kullanici_adin"
          maxLength={30}
          autoFocus
          autoComplete="off"
        />
        <UsernameFeedback status={status} />
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {submitting ? 'Kaydediliyor…' : 'İleri'}
      </Button>
    </form>
  );
}

function UsernameFeedback({ status }: { status: Status }) {
  switch (status) {
    case 'checking':
      return <p className="min-h-5 text-sm text-muted-foreground">Kontrol ediliyor…</p>;
    case 'available':
      return <p className="min-h-5 text-sm text-primary">Bu kullanıcı adı kullanılabilir.</p>;
    case 'taken':
      return <p className="min-h-5 text-sm text-destructive">Bu kullanıcı adı zaten alınmış.</p>;
    case 'invalid':
      return (
        <p className="min-h-5 text-sm text-destructive">
          Kullanıcı adı 3-30 karakter olmalı; yalnızca harf, rakam ve alt çizgi içerebilir.
        </p>
      );
    case 'error':
      return <p className="min-h-5 text-sm text-destructive">Bağlantı hatası, tekrar dene.</p>;
    case 'idle':
    default:
      return <p className="min-h-5 text-sm" />;
  }
}
