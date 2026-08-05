// Supabase auth hata mesajları İngilizce ve bazen teknik/altyapı ipucu içerir
// ("Enable Custom SMTP to increase the rate limit" gibi). Bunları kullanıcıya
// göstermek hem dil hem güvenlik/UX açısından yanlış. Bilinen kalıpları Türkçe
// karşılığına eşler; TANINMAYAN her mesaj generic Türkçe metne düşer — böylece
// ham teknik ayrıntı asla arayüze sızmaz. Eşleşme küçük harfe indirilmiş
// substring ile yapılır (Supabase metinleri sürümle değişebilir).
const PATTERNS: { match: string; tr: string }[] = [
  { match: 'invalid login credentials', tr: 'E-posta veya şifre hatalı.' },
  { match: 'email not confirmed', tr: 'E-postanı henüz doğrulamadın. Gelen kutundaki doğrulama bağlantısına tıkla.' },
  { match: 'already registered', tr: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.' },
  { match: 'user already', tr: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.' },
  { match: 'password should be at least', tr: 'Şifre en az 6 karakter olmalı.' },
  { match: 'weak password', tr: 'Şifre çok zayıf. Daha güçlü bir şifre seç.' },
  { match: 'unable to validate email', tr: 'Geçerli bir e-posta adresi gir.' },
  { match: 'invalid email', tr: 'Geçerli bir e-posta adresi gir.' },
  { match: 'for security purposes', tr: 'Güvenlik nedeniyle kısa bir süre beklemen gerekiyor. Lütfen birazdan tekrar dene.' },
  { match: 'rate limit', tr: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.' },
  { match: 'custom smtp', tr: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.' },
  { match: 'too many requests', tr: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.' },
  { match: 'signups not allowed', tr: 'Kayıt şu anda kapalı.' },
  { match: 'signup is disabled', tr: 'Kayıt şu anda kapalı.' },
  { match: 'email link is invalid or has expired', tr: 'Bağlantının süresi dolmuş veya geçersiz. Lütfen yeniden dene.' },
];

const GENERIC = 'Bir hata oluştu. Lütfen tekrar dene.';

export function authErrorToTurkish(message: string | null | undefined): string {
  if (!message) return GENERIC;
  const lower = message.toLowerCase();
  for (const { match, tr } of PATTERNS) {
    if (lower.includes(match)) return tr;
  }
  return GENERIC;
}
