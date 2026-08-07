// Next.js her sunucu başlangıcında bir kez çağırır. Zorunlu env eksikse
// sessizce `undefined` string'e girmesindense burada gürültüyle patla.
export async function register() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'PUBLIC_URL',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Eksik zorunlu env değişkeni: ${missing.join(', ')}`);
  }
}
