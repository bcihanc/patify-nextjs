// Next.js her sunucu başlangıcında bir kez çağırır.
// FATAL yalnızca yokluğunda uygulama anlamsız şekilde çöken var'lar için:
// Supabase URL/anon key olmadan her DB/Auth çağrısı kripterek patlar.
// PUBLIC_URL (layout'ta prod fallback'i var) ve Maps key (hasMapsKey() ile
// graceful degrade) yoklukta çalışmaya devam eder — bunları fatal yapmak tüm
// siteyi düşürür, o yüzden yalnızca uyarı.
export async function register() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Eksik zorunlu env değişkeni: ${missing.join(', ')}`);
  }

  const optional = ['PUBLIC_URL', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'];
  const missingOptional = optional.filter((k) => !process.env[k]);
  if (missingOptional.length > 0) {
    console.warn(`Eksik opsiyonel env değişkeni (degrade ile devam): ${missingOptional.join(', ')}`);
  }
}
