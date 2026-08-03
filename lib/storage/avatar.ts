import { createClient } from '@/lib/supabase/client';

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.5;

// Re-encodes an arbitrary image File to a JPEG capped at MAX_EDGE on its
// longest side, using a canvas (no extra npm dependency — see task-10-brief.md §9).
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context oluşturulamadı');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Görsel sıkıştırılamadı'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

// Compresses `file` client-side and uploads it to the public `assets`
// bucket at a flat `<uuid>.jpg` path. Returns the bare path — callers store
// this in `user_profiles.profile_photo`, matching the mobile convention
// (lib/lost-found.ts turns these bare filenames into full URLs).
export async function uploadAvatar(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${crypto.randomUUID()}.jpg`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from('assets')
    .upload(path, compressed, { contentType: 'image/jpeg' });
  if (error) throw error;

  return path;
}

// Turns a bare avatar path (as stored in user_profiles.profile_photo) into a
// full public URL against the `assets` bucket — same construction as
// lib/lost-found.ts's image URL helper, duplicated here since that one is
// module-private and lost-found listings are a separate concern.
export function avatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
}
