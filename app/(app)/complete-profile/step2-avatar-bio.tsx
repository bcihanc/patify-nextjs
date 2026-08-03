'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/storage/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const BIO_MAX = 160;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Step 2 of the /complete-profile gate: optional avatar + bio (spec §4.2).
// "Şimdilik geç" and a bare finish both write nothing beyond what the user
// filled in, then route to /lost-found.
export function Step2AvatarBio({ userId }: { userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Object URL lifecycle lives here (not inside handleFileChange) so it's
  // revoked exactly once per file change and on unmount, regardless of
  // React re-invoking the effect in Strict Mode.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setAvatarError(null);
    if (selected && !ALLOWED_AVATAR_TYPES.includes(selected.type)) {
      setAvatarError('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin.');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  }

  async function finish() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();

      if (file) {
        const path = await uploadAvatar(file);
        const { error } = await supabase
          .from('user_profiles')
          .update({ profile_photo: path })
          .eq('id', userId);
        if (error) throw error;
      }

      const trimmedBio = bio.trim();
      if (trimmedBio !== '') {
        const { error } = await supabase
          .from('user_profiles')
          .update({ bio: trimmedBio })
          .eq('id', userId);
        if (error) throw error;
      }

      router.push('/lost-found');
    } catch {
      setSubmitting(false);
      setSubmitError('Kaydedilemedi, tekrar dene.');
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    void finish();
  }

  function handleSkip() {
    if (submitting) return;
    router.push('/lost-found');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Hadi seni biraz tanıyalım</h1>
        <p className="text-muted-foreground">
          Profil fotoğrafı ve kısa bir bio ekleyebilirsin (zorunlu değil).
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet
          <img
            src={previewUrl}
            alt=""
            className="h-24 w-24 rounded-full border border-border bg-secondary object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground">
            <User className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-col items-center gap-1.5">
          <Label htmlFor="avatar">Profil fotoğrafı (opsiyonel)</Label>
          <input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="text-sm"
          />
          {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio (opsiyonel)</Label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Kendinden ve evcil hayvanından bahset…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-right text-xs text-muted-foreground">{bio.length}/{BIO_MAX}</p>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Kaydediliyor…' : 'Bitir'}
      </Button>
      <Button type="button" variant="ghost" disabled={submitting} onClick={handleSkip} className="w-full">
        Şimdilik geç
      </Button>
    </form>
  );
}
