# F2 — Kullanıcı & Profil: Sosyal Katman (Tasarım)

- **Tarih:** 2026-08-04
- **Program fazı:** Faz 2 — *Kullanıcı & Profil* (bkz. F0 spec §0). Bu spec fazın **bugün kurulabilir dilimini** kapsar.
- **Durum:** Onaylandı (brainstorming) → plan yazımına hazır
- **Repo:** `patify-nextjs` (Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr`)
- **Kardeş kaynak:** `/Users/cihan/IdeaProjects/patify` (Flutter mobil — özellik referansı)

---

## 0. Program bağlamı ve bu spec'in yeri

Program hedefi: mobildeki tüm özellikleri web'e eksiksiz taşımak (F0 spec §0). Web ile mobil **aynı Supabase projesini** (`uynwrqccvfcwunrzoxva`) paylaşır — tablolar, RLS, storage ortak; iş, mevcut backend'e karşı **web UI + istemci mantığı** yazmaktır.

**Faz 2 = Kullanıcı & Profil (takip/takipçi, `user/:id`, bookmarks).** Ancak fazın büyük kısmı henüz web'de olmayan içerik domainlerine bağlı:

| Faz 2 parçası | Bağımlılık | Bu spec'te |
|---|---|---|
| Takip grafiği (takip/takipçi) | Yok — `user_followings` tablosu mevcut | ✅ **BUILD** |
| Public profil başlığı + aksiyonlar | Yok — `user_profiles`/`user_blockings` mevcut | ✅ **BUILD** |
| Takipçi/takip listeleri (kendi) | Yok | ✅ **BUILD** |
| Profil içerik sekmeleri (Lost&Found, Adoptions) | Faz 3 (LF), Faz 6 (Adoptions) — web'de yok | ⛔ **DEFER** |
| Bookmarks (post/discussion/lost-found/adoption) | Faz 3-6 — dört domain de web'de yok | ⛔ **DEFER** |
| Message butonu (DM) | Faz 7 (Chats) | ⛔ **DEFER** |
| Trust rozeti / trust panel | Faz 9 (Trust) | ⛔ **DEFER** |
| Takip push bildirimi | Faz 8 (Web Push) | ⛔ **DEFER** |

> **Karar (kullanıcı, 2026-08-04):** "Sosyal katman şimdi." Faz 2 bugün kurulabilir dilimle sınırlanır; içerik sekmeleri ve bookmarks ilgili domain fazları geldiğinde profil sayfasına eklenir. Bu bir kapsam kesintisi değil, bağımlılık kaynaklı ertelemedir ve aşağıda **açıkça** işaretlenir (fail-loud).

**F0'dan devralınan (Faz 2'de TEKRAR YAPILMAYACAK):**
- Sosyal link **düzenleme** (x/instagram/telegram/tiktok/facebook), avatar yükleme, bio, telefon, konum → `app/(app)/profile/edit/edit-profile-form.tsx` + `updateProfileAction`.
- Avatar yükleme/URL: `lib/storage/avatar.ts` (`uploadAvatar`, `avatarUrl`).
- Engel *kaldırma* + engellenenler listesi: `unblockUserAction` + `app/(app)/profile/blocked/page.tsx`.
- Kendi profil verisi (owner-only PII dahil): `getCurrentUserProfile()` (`lib/profile/server.ts`).
- Tema/marka token'ları, `(app)` gate zinciri, responsive AppShell.

---

## 1. Faz 2 hedefi ve kilitlenen kararlar

**Hedef:** Web'e, kullanıcıların birbirini görebildiği/takip edebildiği **sosyal katmanı** eklemek: gerçek kendi-profil sayfası, başka kullanıcının profili (`/profile/user/:id`), takip/engelle aksiyonları ve kendi takipçi/takip listeleri.

**Kilitlenen kararlar:**

| Karar | Seçim | Gerekçe |
|---|---|---|
| Faz 2 kapsamı | **Sosyal katman şimdi** — grafik + profil başlığı/aksiyonları + kendi listeleri | Kullanıcı kararı; içerik sekmeleri/bookmarks bağımlılık nedeniyle ertelenir |
| Mutasyonlar (follow/unfollow/block) | **Server Action** (`app/actions.ts`) | F0 kalıbı (`unblockUserAction`); session-authoritative, `user_id` asla client'tan |
| Okumalar (profil, sayı, isFollowing, listeler) | **Server Component + `lib/` server fn** | F0 kalıbı (`getCurrentUserProfile`); tek round-trip, gizlilik sınırı server'da |
| Buton durum güncellemesi | **İstemci optimistic + `router.refresh()`** | Anlık geri bildirim; server yeniden doğrular |
| Public profil görünürlüğü | **Authed-only** (`(app)` altında) | Mobil parite; profil sayfası authed shell içinde |
| Public profil sayaç link'i | Public'te **display-only**; kendi profilde **tıklanır** liste | Mobil, başka kullanıcının takipçi listesini ifşa etmez (param'sız route); bu gizlilik duruşu korunur |
| Sosyal link güvenliği | **`safeSocialUrl` TS portu** + host allow-list | Mobil parite; crafted phishing host'unu engeller |
| Diğer kullanıcının PII'si | **Sadece public kolonlar** okunur; `user_private` ASLA | RLS zaten engeller; kod da savunma yapar |

---

## 2. Kapsam sınırları

**IN (bu spec):**
1. Takip veri katmanı: follow / unfollow / isFollowing / takipçi-takip sayıları / kendi takipçi & takip listeleri.
2. Engelle veri katmanı: block (yeni) + isBlocked okuma (unblock zaten var).
3. Public profil sayfası `/profile/user/[id]` — başlık + Takip Et/Bırak + Engelle/Kaldır.
4. Kendi profil sayfası `/profile` — placeholder'ı gerçek başlıkla değiştir (avatar, kullanıcı adı, bio, sayaçlar, sosyal linkler, Düzenle/Ayarlar linkleri).
5. Kendi takipçi/takip listeleri `/profile/followers`, `/profile/followings`.
6. Yeniden kullanılabilir bileşenler: `UserAvatar`, `FollowButton`, `BlockButton`, `SocialLinks`, `UserListRow`, `ProfileHeader`.
7. `safeSocialUrl` TS portu + host sabitleri.

**OUT (ertelenen — fail-loud):**
- Profil içerik sekmeleri (Lost&Found, Adoptions, Posts, Discussions) → domain fazları.
- Bookmarks / kaydedilenler → domain fazları.
- Message / DM butonu → Faz 7.
- Trust rozeti / trust progress → Faz 9.
- Takip sonrası push bildirimi → Faz 8.
- Profile-completion nudge kartı → minor, gerekmiyorsa yapılmaz.
- Kullanıcı arama sayfası → mobilde Faz 2 kapsamında yok; yapılmaz (YAGNI).
- Başka kullanıcının takipçi/takip **listesi** (public scoped list) → gizlilik paritesi; ertelenir.

**Bootstrap notu:** Web'de bugün `/profile/user/[id]`'ye götüren tek yüzey, kendi takipçi/takip listelerindeki satırlardır (+ doğrudan URL). İçerik fazları geldiğinde yazar avatarları profillere linklenerek keşif genişler. Bu Faz 2 için yeterli, kullanılabilir bir grafiktir.

---

## 3. Marka / tema

Yeni token yok. F0'da kurulan tema (terracotta `#BE4E2B`, sıcak krem arka plan, Nunito; dark `#17140F`/`#F2EBE0`) ve shadcn/ui bileşenleri (`Button`, `Input`, `Label`) aynen kullanılır. Avatar/sayaç/buton düzenleri mobil profil sayfasının bilgi mimarisini izler (başlık: avatar → sayaçlar → sosyal linkler → bio → aksiyonlar).

---

## 4. Rota ağacı (Faz 2 eklemeleri)

Hepsi `app/(app)/` altında → F0 gate zinciriyle korunur (login → complete-profile → accept-consent geçmiş authed kullanıcı).

```
app/(app)/profile/
  page.tsx                     # DEĞİŞ: placeholder → gerçek kendi-profil
  user/[id]/page.tsx           # YENİ: public profil
  followers/page.tsx           # YENİ: kendi takipçilerin
  followings/page.tsx          # YENİ: kendi takip ettiklerin
  (mevcut: settings/, edit/, change-password/, blocked/, delete/)
```

Rota paritesi mobil ile: `/profile`, `/profile/user/:id`, `/profile/followers`, `/profile/followings`.

**Kenar durumlar:**
- `/profile/user/[id]` — `id` kendi kullanıcı id'in ise: kendi profiline yönlendir (`redirect('/profile')`) VEYA aksiyonları gizle (self). Karar: **`/profile`'a redirect** (tek doğru kendi-profil yüzeyi).
- `id` bulunamazsa (profil yok / geçersiz uuid): `notFound()` (404).

---

## 5. Veri katmanı

### 5.1 Tablolar (mevcut, migration YOK)
- **`user_followings`**: `user_id` (takip eden), `followed_user_id` (takip edilen). Bileşik ilişki; her ikisi de `user_profiles.id` FK.
- **`user_blockings`**: `user_id` (engelleyen), `blocked_user_id` (engellenen).
- **`user_profiles`**: `id`, `username`, `bio`, `profile_photo`, `x_url`, `instagram_url`, `telegram_url`, `tiktok_url`, `facebook_url` (+ owner-only olmayan diğerleri).

RLS: mobil bu tablolara **direct table access** ile okur/yazar (RPC yok). Aynı erişim web session'ı ile de geçerli. Diğer kullanıcının `user_profiles` satırı okunabilir; `user_private` **okunamaz** (owner-only) — kodda da hiç sorgulanmaz.

### 5.2 Tipler — `lib/profile/types.ts` (genişlet)
```ts
// Başka bir kullanıcının GÖRÜNÜR profili — asla PII (user_private) içermez.
export type PublicUserProfile = Pick<
  Database['public']['Tables']['user_profiles']['Row'],
  'id' | 'username' | 'bio' | 'profile_photo'
  | 'x_url' | 'instagram_url' | 'telegram_url' | 'tiktok_url' | 'facebook_url'
>;

// Liste satırı için hafif özet.
export type PublicUserSummary = Pick<
  Database['public']['Tables']['user_profiles']['Row'],
  'id' | 'username' | 'profile_photo'
>;

export type FollowCounts = { followers: number; following: number };
```

### 5.3 Okuma fonksiyonları
**`lib/profile/public.ts`** (yeni):
- `getPublicProfile(id: string): Promise<PublicUserProfile | null>` — `user_profiles`'tan SADECE public kolonları seç (`.select('id,username,bio,profile_photo,x_url,instagram_url,telegram_url,tiktok_url,facebook_url')`), `.eq('id', id).maybeSingle()`. `*` KULLANMA — PII kolonu sızdırmamak için açık kolon listesi.

**`lib/follow/server.ts`** (yeni):
- `getFollowCounts(userId: string): Promise<FollowCounts>` — iki `.count()` sorgusu: followers = `user_followings` where `followed_user_id=userId`; following = where `user_id=userId`.
- `isFollowing(followerId: string, followedId: string): Promise<boolean>` — `user_followings` `.eq('user_id',followerId).eq('followed_user_id',followedId).maybeSingle()` != null.
- `isBlocked(blockerId: string, blockedId: string): Promise<boolean>` — `user_blockings` `.eq('user_id',blockerId).eq('blocked_user_id',blockedId).maybeSingle()` != null.
- `listFollowers(userId: string): Promise<PublicUserSummary[]>` — `user_followings` `.select('follower:user_id(id,username,profile_photo)').eq('followed_user_id',userId)` → map.
- `listFollowing(userId: string): Promise<PublicUserSummary[]>` — `.select('followed:followed_user_id(id,username,profile_photo)').eq('user_id',userId)` → map.

> Not: Embedded select (`follower:user_id(...)`) mobil `listFollowers/listFollowings` kalıbının birebir karşılığıdır (orada `user:user_id(*)`). Web'de `*` yerine üç public kolon seçilir.

### 5.4 Mutasyon Server Action'ları — `app/actions.ts` (ekle)
Hepsi: `getUser()` → yoksa `redirect('/auth/login')`; `user_id` session'dan (asla client). Girdi tek argüman `targetUserId: string`. Dönüş `{ error: string } | { ok: true }` (F0 aksiyon dönüş kalıbıyla uyumlu; buton client tarafta yorumlar).

- `followUserAction(targetUserId)` — self ise no-op error; `user_blockings` çift yönlü kontrol server'da gerekmez (RLS + insert), ama **self-follow reddi** ve **zaten-takip idempotency** (insert çakışırsa sessizce ok). `insert({user_id: user.id, followed_user_id: targetUserId})`; unique-violation → ok (zaten takip ediyor).
- `unfollowUserAction(targetUserId)` — `delete().eq('user_id',user.id).eq('followed_user_id',targetUserId)`.
- `blockUserAction(targetUserId)` — self ise error; `insert({user_id:user.id, blocked_user_id:targetUserId})` (idempotent). **Yan etki:** engellemek takip ilişkisini de kaldırmalı mı? Mobilde block insert'ü RLS ile karşı tarafın follow'unu engeller ama mevcut follow satırını otomatik silmez. Parite: sadece block insert; follow satırı ayrı kalır (mobil davranışı). Not olarak bırakılır.
- (mevcut) `unblockUserAction` — `/profile/blocked` FormData kalıbında; yeni `BlockButton` için `targetUserId` argümanlı bir sarmalayıcı gerekiyorsa eklenebilir, ama tercih: `BlockButton` unblock için de argümanlı yeni bir action (`unblockUserActionById`) kullansın; mevcut FormData tabanlı `unblockUserAction` `/profile/blocked` sayfası için dokunulmadan kalır.

---

## 6. Özellik spec'leri

### 6.1 `safeSocialUrl` — `lib/social/safe-url.ts` (yeni)
Mobil `PatifyValidators.safeSocialUrl` TS portu:
```ts
export function safeSocialUrl(input: string | null | undefined, allowedHosts: Set<string>): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  let uri: URL;
  try { uri = new URL(candidate); } catch { return null; }
  if (uri.protocol !== 'https:') return null;
  const host = uri.host.toLowerCase();
  if (!host || !allowedHosts.has(host)) return null;
  return uri.toString();
}
```
Host sabitleri (mobil `constants.dart` birebir):
```ts
export const INSTAGRAM_HOSTS = new Set(['instagram.com','www.instagram.com']);
export const TIKTOK_HOSTS = new Set(['tiktok.com','www.tiktok.com','vm.tiktok.com']);
export const FACEBOOK_HOSTS = new Set(['facebook.com','www.facebook.com','m.facebook.com','fb.com','fb.me']);
export const X_HOSTS = new Set(['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com']);
export const TELEGRAM_HOSTS = new Set(['t.me','telegram.me','www.telegram.me','telegram.org']);
```

### 6.2 `UserAvatar` — `components/user/user-avatar.tsx`
Server-safe (client değil). Props: `{ username: string | null; profilePhoto: string | null; size?: number }`. `profilePhoto` varsa `avatarUrl(profilePhoto)` ile `<img>` (F0'daki `eslint-disable no-img-element` + `next/image remotePatterns yok` kalıbı); yoksa baş harf dairesi (`username?.[0]?.toUpperCase() ?? '?'`, `bg-secondary`). F0 AppShell avatar dairesiyle görsel tutarlı.

### 6.3 `SocialLinks` — `components/user/social-links.tsx`
Props: `PublicUserProfile`'ın sosyal alanları. Her link `safeSocialUrl(...)` ile doğrulanır; `null` dönerse ikon **gösterilmez**. Geçerli olanlar `<a href target="_blank" rel="noopener noreferrer">` + `lucide-react` ikon (Instagram, TikTok yoksa uygun ikon, Facebook, Twitter/X, Send/Telegram). Hepsi null ise bileşen hiçbir şey render etmez.

### 6.4 `ProfileHeader` — `components/user/profile-header.tsx`
Hem kendi hem public profilde kullanılır. Props: `{ profile: PublicUserProfile; counts: FollowCounts; countsHref?: { followers: string; following: string } | null; actions?: React.ReactNode }`.
- Düzen: `UserAvatar` (büyük) → kullanıcı adı → sayaç satırı (`following` + `followers`; `countsHref` verilirse `<Link>`, yoksa düz metin) → `SocialLinks` → bio (varsa) → `actions` (verilirse).
- Kendi profil: `countsHref = { followers:'/profile/followers', following:'/profile/followings' }`, `actions = Düzenle + Ayarlar linkleri`.
- Public profil: `countsHref = null` (display-only), `actions = <FollowButton/> + <BlockButton/>` (self değilse).

### 6.5 `FollowButton` — `components/user/follow-button.tsx` (client)
Props: `{ targetUserId: string; initialFollowing: boolean }`. `useState` ile optimistic toggle; `followUserAction`/`unfollowUserAction` çağrısı; hata olursa state geri alınır + hata mesajı. Başarıda `router.refresh()` ile sayaçları tazele. Takip ediyorsa "Takibi bırak", etmiyorsa "Takip et". Engelli durumda gizlenir (parent karar verir).

### 6.6 `BlockButton` — `components/user/block-button.tsx` (client)
Props: `{ targetUserId: string; initialBlocked: boolean }`. Optimistic; `blockUserAction`/`unblockUserActionById`. Engelliyken "Engeli kaldır", değilken "Engelle". Engellendiğinde `FollowButton` gizlenir (parent, `blocked` state'ini paylaşır — ya da her buton bağımsız + `router.refresh()` ile senkron). Karar: **parent (`UserProfileActions` client wrapper) `blocked` + `following` state'ini tutar**, iki butonu koordine eder; böylece engelle → takip butonu anında gizlenir (mobil `UserFollowOrBlockWidget` davranışı).

### 6.7 `UserProfileActions` — `components/user/user-profile-actions.tsx` (client)
Public profildeki aksiyon satırını koordine eden client wrapper. Props: `{ targetUserId; initialFollowing; initialBlocked }`. `blocked` ise sadece "Engeli kaldır"; değilse "Takip et/bırak" + "Engelle". Mobil `UserFollowOrBlockWidget`'in Message'sız/trust'sız sadeleştirilmiş hali.

### 6.8 `UserListRow` — `components/user/user-list-row.tsx`
Takipçi/takip listelerinde satır. Props: `PublicUserSummary`. `UserAvatar` (küçük) + kullanıcı adı, tümü `/profile/user/[id]`'ye `<Link>`. (Faz 2'de satır içi follow butonu YOK — YAGNI; keşif listeden profile geçişle olur.)

### 6.9 Sayfalar
- **`/profile` (kendi):** `getCurrentUserProfile()` + `getFollowCounts(user.id)`. `ProfileHeader` (kendi modu). İçerik sekmesi yerine küçük not: "İlanların ve kaydettiklerin yakında." (fail-loud deferral; kısa, tek satır). Placeholder tamamen kaldırılır.
- **`/profile/user/[id]` (public):** `id === currentUserId` → `redirect('/profile')`. `getPublicProfile(id)` null → `notFound()`. `getFollowCounts(id)`, `isFollowing(me,id)`, `isBlocked(me,id)`. `ProfileHeader` (public modu) + `UserProfileActions`.
- **`/profile/followers` (kendi):** `listFollowers(user.id)` → `UserListRow` listesi; boşsa boş-durum ("Henüz takipçin yok.").
- **`/profile/followings` (kendi):** `listFollowing(user.id)` → aynı; boşsa "Henüz kimseyi takip etmiyorsun."

### 6.10 Nav bağlama
F0 AppShell'de "Profil" zaten `/profile`'a gidiyor (`nav-items.ts`). Ek nav değişikliği gerekmez. (İçerik yazar-linkleri domain fazlarında eklenir.)

---

## 7. Güvenlik & gizlilik

1. **PII sızıntısı yok:** `getPublicProfile` açık kolon listesiyle sorgular; `user_private` hiçbir public yolda okunmaz. (F0'da AppShell'e tam profil geçme hatası yaşandı — burada baştan public tip.)
2. **Server-authoritative mutasyon:** follow/unfollow/block/unblock `user_id`'yi daima `getUser()`'dan alır; client'tan gelen sadece `targetUserId`. RLS ikinci savunma.
3. **Sosyal link host doğrulaması:** `safeSocialUrl` https + allow-list host şartı; `javascript:`/look-alike host reddedilir. Linkler `rel="noopener noreferrer"`.
4. **Self-action reddi:** self-follow/self-block server'da reddedilir; `/profile/user/[id]` self ise `/profile`'a redirect.
5. **XSS:** tüm kullanıcı metni (username, bio) JSX interpolasyonu ile render — React otomatik escape; `dangerouslySetInnerHTML` yok.
6. **Idempotency:** tekrar follow/block insert çakışması sessizce başarı sayılır (unique violation yakalanır), çift tık hata göstermez.

---

## 8. Başarı kriterleri

1. Giriş yapmış kullanıcı `/profile`'da kendi avatar/kullanıcı adı/bio/sosyal linkleri ve doğru takipçi-takip sayılarını görür; sayaçlar kendi listelerine tıklanır.
2. `/profile/user/[id]` başka bir kullanıcının public profilini gösterir; PII (telefon, doğum tarihi, konum, consent) **görünmez** ve sorgulanmaz.
3. Public profilde "Takip et" → satır anında "Takibi bırak" olur, sayfa yenilendiğinde kalıcıdır; DB'de `user_followings` satırı oluşur/silinir.
4. Public profilde "Engelle" → takip butonu gizlenir, "Engeli kaldır" görünür; `user_blockings` satırı oluşur/silinir. Engel kaldırılınca takip butonu geri gelir.
5. `/profile/user/[id]` kendi id'in ile açılırsa `/profile`'a yönlenir; olmayan id `notFound()`.
6. `/profile/followers` ve `/profile/followings` doğru kullanıcı özetlerini listeler; her satır o kullanıcının `/profile/user/[id]` sayfasına götürür; boş durumlar TR mesajla gösterilir.
7. Geçersiz/foreign-host sosyal link (ör. `javascript:...` veya `instagram-login.evil.tr`) profilde **hiç** link olarak render edilmez.
8. self-follow ve self-block server'da reddedilir; çift follow/block hata üretmez.
9. `npm run build` temiz (TS strict: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitReturns`).
10. Ertelenen yüzeyler (içerik sekmeleri, bookmarks, message, trust) kodda veya UI'da **sessizce eksik değil** — kısa "yakında" notu veya spec'te açık deferral olarak işaretli.

---

## 9. Global Constraints

- **Dil:** TR-only. Tüm UI metni Türkçe; `<html lang="tr">` (F0'dan).
- **TS strict:** `noUncheckedIndexedAccess` (dizi indeksi `T | undefined` → `rows[i]!` + disable comment kalıbı, F0'daki gibi), `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Kullanılmayan import/değişken `next build`'i düşürür — ölü import bırakma.
- **Backend değişmez:** migration YOK, canlı DB yazımı YOK (tüm tablolar mevcut). Sadece mevcut şemaya karşı okuma/yazma UI'ı.
- **Supabase client seçimi:** Server Component/Action → `await createClient()` (`lib/supabase/server`); Client Component → `createClient()` (`lib/supabase/client`).
- **Mutasyon deseni:** F0 `unblockUserAction` kalıbı — `getUser()` gate, `user_id` session'dan, RLS ikinci savunma.
- **PII sınırı:** başka kullanıcı için ASLA `user_private` ve ASLA `user_profiles.*` (`*`) — açık public kolon listesi.
- **Görsel:** avatarlar `<img>` + `eslint-disable @next/next/no-img-element` (F0 kalıbı; `next/image remotePatterns` bilinçli olarak yapılandırılmadı).
- **Marka:** F0 tema token'ları; yeni renk/token eklenmez.
- **Rota paritesi:** `/profile`, `/profile/user/:id`, `/profile/followers`, `/profile/followings` (mobil ile aynı).

---

## 10. Test / doğrulama stratejisi

Repo'da test runner yok (F0'daki gibi). Doğrulama:
- **`npm run build`** — TS/ESLint kapısı (otoritatif).
- **Cihaz/smoke (Chrome MCP):** iki test kullanıcısıyla — A, B'yi `/profile/user/[B]`'den takip eder; A'nın `/profile/followings` ve B'nin sayaçları güncellenir; A B'yi engeller → takip butonu kaybolur; A kendi `/profile`'ında sayaçlarını görür; self profil URL'i `/profile`'a yönlenir; geçersiz sosyal link render edilmez.
- **DB doğrulaması:** follow/block sonrası satır varlığı MSSQL değil — Supabase; canlı yazımı test kullanıcısı ile UI üstünden yapılır (STOP koşulu değil: mevcut tabloya normal uygulama yazımı, migration/şema değişikliği değil).

> Not: F0'da build+review'ın kaçırdığı gerçek bir 500 cihaz-doğrulamasında yakalandı — escalate'ten önce cihaz/smoke şart.
