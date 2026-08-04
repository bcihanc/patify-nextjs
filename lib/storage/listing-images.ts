import { createClient } from '@/lib/supabase/client';

export const LISTING_IMAGE_MAX = 3;
export const ALLOWED_LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.6;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context oluşturulamadı');
  ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close();
  return new Promise((res, rej) => canvas.toBlob(
    (b) => (b ? res(b) : rej(new Error('Görsel sıkıştırılamadı'))), 'image/jpeg', JPEG_QUALITY));
}

// Sıralı upload — bare filename dizisi (DB images kolonu bunları saklar).
export async function uploadListingImages(files: File[]): Promise<string[]> {
  const supabase = createClient();
  const names: string[] = [];
  for (const file of files.slice(0, LISTING_IMAGE_MAX)) {
    const blob = await compress(file);
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('assets').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    names.push(path);
  }
  return names;
}
