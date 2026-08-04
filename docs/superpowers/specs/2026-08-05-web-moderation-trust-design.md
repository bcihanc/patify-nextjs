# Web Moderation + Trust + About/Settings — Design Spec

**Date:** 2026-08-05
**Program:** Patify mobil→web parite. Bu faz = **Moderasyon (reports) + Trust + About/Feedback/Ayarlar deltası**.
**Branch:** `feat/web-moderation-trust` · base `main@cac4b83`

## 1. Overview / Goal

Mobil "trust & safety + hesap" yüzeyinin web'de eksik kalan parçalarını tamamla. Web'de **zaten var** (bu fazda DOKUNULMAZ): change-password, blocked-users list/yönetim, analytics-consent toggle, export/delete (Edge fn'ler wired), legal sayfalar (/pp /tos /cr /csae), block/unblock action'ları, `user_private` read/write.

**Bu fazda yapılacak (delta):**
1. **Reports (moderasyon)** — şikayet action'ı + paylaşılan "..." menü (Paylaş/Şikayet) + şikayet-neden dialog'u; emergency/adoptions/lost-found detaylarına bağla (Emergency/Adoptions'ın ertelenmiş Report menüsünü aç).
2. **Trust** — 2 read-only RPC sarmalayıcı + güvenilir-üye rozeti (profil başlığı + kullanıcı kartları) + kendi trust-progress paneli.
3. **About + Feedback** — Hakkında sayfası + geri bildirim (action + dialog).
4. **DM opt-out** — `accepts_dms` fetch/set action + ayarlar tile'ı.

## 2. CRITICAL — schema (migration YOK, stale-types)

Web `database.types.ts` **bilinçli bayat** ve Supabase client **untyped** (`createServerClient(...)` generic'siz — `lib/supabase/server.ts` doğrulandı). Bu yüzden:
- `reports` enum'ları web types'ta DAR (`report_entity`'de `lost_found`/`lost_found_sightings`/`emergency` yok; `report_type`'ta `sale_commercial_content` yok). **Ama mobil bu değerleri AYNI canlı DB'ye yazıyor** (emergency_detail + lost_found_detail `SupabaseEntity.emergency`/`.lost_found` ile şikayet ediyor). → Canlı DB enum'ları TAM; web types bayat. **Migration YOK.**
- `user_private.accepts_dms` web types'ta yok ama mobil `user_private`'a upsert ediyor (`dm_permission_repo.dart`). → Kolon canlı DB'de var. **Migration YOK.**
- Trust RPC'leri (`trusted_member_flags`, `my_trust_progress`) web types'ta yok ama mobil çağırıyor. → Canlı DB'de var.

Untyped client string enum değerlerini/kolonları derlemede engellemez (emergency fazı `emergency_cases`'e — types'ta olmayan tablo — yazıp temiz build aldı; kanıt). **Fail-loud:** runtime'da bir insert `22P02` (invalid enum) verirse, o değer canlı DB'de YOK demektir → DUR (migration gerekir). Runtime auth-gated → test kimliği olmadan doğrulanamaz (F0-Emergency emsali).

## 3. Reports — `lib/reports/*`

`lib/reports/types.ts`:
```ts
export type SupabaseEntity =
  | 'posts' | 'post_comments' | 'discussion' | 'discussion_answers'
  | 'discussion_answer_comments' | 'adoptions' | 'adoption_comments'
  | 'lost_found' | 'lost_found_sightings' | 'emergency';
export type ReportType =
  | 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity'
  | 'false_information' | 'sale_commercial_content' | 'other';
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  spam: 'Spam', harassment: 'Taciz', hate_speech: 'Nefret söylemi',
  violence: 'Şiddet', nudity: 'Müstehcenlik', false_information: 'Yanlış bilgi',
  sale_commercial_content: 'Satış/ticari içerik', other: 'Diğer',
};
```
Enum'lar mobil `reports_models.dart` ile byte-exact.

`lib/reports/actions.ts` (`'use server'`):
- **`reportAction(entity, entityId, type): Result`**: `getUser()` gate → yoksa `{error:'Oturum bulunamadı.'}`. INSERT `reports` açık kolon `{entity, entity_id: entityId, type, user_id: user.id}` (session-authoritative). Idempotent değil (DB'ye bırak); hata → console.error + generic. Dönüş `{ok:true}`.
- **`hasReportedAction(entity, entityId): boolean`**: getUser → yoksa false. `.from('reports').select('id').eq('entity',...).eq('entity_id',...).eq('user_id',user.id).maybeSingle()` → satır var mı. (Mobil `hasReported` paritesi.)

## 4. Reports UI — paylaşılan aksiyon menüsü

`components/shared/entity-action-menu.tsx` (client): `components/ui/dropdown-menu` kullanan bir "..." menüsü.
- Props: `{ entity: SupabaseEntity, entityId: string, isOwner: boolean, shareUrl?: string, shareText?: string }`.
- **Paylaş** (herkes): `shareOrCopy(url, text)` — `navigator.share` varsa onu, yoksa `navigator.clipboard.writeText` + "Bağlantı kopyalandı" bildirimi. Util `lib/share.ts`.
- **Şikayet et** (yalnızca `!isOwner`): şikayet-neden dialog'u açar (`ReportDialog`). Zaten şikayet edildiyse (`hasReportedAction`) "Şikayet edildi" pasif gösterim.
- Owner ise Şikayet gizli (mobil: reporter kendi vakasını şikayet edemez).

`components/shared/report-dialog.tsx` (client): `ReportType` seçenekleri (radio/list, `REPORT_TYPE_LABELS`), gönder → `reportAction` → başarı bildirimi + kapat; hata → inline mesaj. Mevcut dialog primitifini (`components/ui/*`) kullan; toast yoksa inline banner (proje kalıbı).

**Wiring (detay sayfaları):**
- `components/emergency/emergency-actions.tsx`: `// DEFERRED: Report` yorumunu kaldır, `EntityActionMenu entity="emergency"` ekle (non-reporter'a). AppBar/başlık alanına yerleştir.
- Adoptions detay (`app/(app)/adoptions/[id]/page.tsx`): `EntityActionMenu entity="adoptions"` (non-owner).
- Lost&found detay: mevcut detay sayfa(lar)ına `EntityActionMenu entity="lost_found"` (non-owner). Public `/lost-found/item/[id]` sayfasında şikayet **login gerektirir** — logged-out'ta menü Şikayet'i gizler veya /auth/login'e yönlendirir; Paylaş logged-out'ta da çalışır.

## 5. Trust — `lib/trust/*`

`lib/trust/types.ts`:
```ts
export type TrustSignals = { photo: boolean; bio: boolean; listings: number; reunions: number; chats: number };
export type TrustProgress = {
  isTrusted: boolean; ageOk: boolean; cleanOk: boolean; hasSignal: boolean;
  signals: TrustSignals; daysSinceSignup: number;
};
```
Mobil `trust_models.dart` ile byte-exact (freezed default'ları: bool false, int 0).

`lib/trust/read.ts`:
- **`fetchTrustFlags(ids: string[]): Promise<Record<string, boolean>>`**: boş → `{}`. UUID-guard (regex; non-UUID id'ler wire'a gitmez, default false — mobil `_uuidPattern` paritesi, mock/skeleton id'leri 22P02 vermesin). `.rpc('trusted_member_flags', {p_ids: castable}).returns<{user_id:string; is_trusted:boolean}[]>()`. Eksik id → false.
- **`fetchMyTrustProgress(): Promise<TrustProgress>`**: `.rpc('my_trust_progress')` → tek obje → TrustProgress (null-safe default'lar). Hata → tümü-false default.

`lib/trust/actions.ts` (`'use server'`): client'ın çağırabilmesi için `myTrustProgressAction()` (getUser gate) + gerekiyorsa `trustFlagsAction(ids)`.

**UI:**
- `components/trust/trust-badge.tsx`: `TrustBadge({ trusted }: { trusted: boolean })` — trusted ise küçük "Güvenilir üye" rozeti (Shield/BadgeCheck lucide ikonu), değilse null. Profil başlığı (`components/user/profile-header.tsx`) + kullanıcı kartı/satırı (`components/user/user-list-row.tsx`, `user-avatar` yanı) — trusted flag'i server'da `fetchTrustFlags` ile toplu çekilir.
- `components/trust/trust-progress-panel.tsx`: kendi trust breakdown (sinyaller: fotoğraf/bio var mı, listing/reunion/chat sayıları, yaş/temizlik kriterleri, kayıttan bu yana gün). Kendi profil sayfasında (`app/(app)/profile/page.tsx`) veya ayarlarda bir bölüm olarak render (server `fetchMyTrustProgress`).

## 6. About + Feedback

`app/(app)/profile/about/page.tsx` (server, login-gated — `(app)` altında): mobil `about_page.dart` paritesi.
- Header: Patify logosu + isim + sürüm (`v` + `process.env.npm_package_version` ya da `package.json`'dan sabit) + tek cümle açıklama.
- **Uygulama** bölümü: Paylaş (`shareOrCopy('https://patify.net/app', 'Patify uygulamasını indir')`), Değerlendir (App Store / Play Store linkleri — mevcut `components/open-in-app-button.tsx`/`hero.tsx`'teki store URL'leri), Geri bildirim (`FeedbackDialog` açar).
- **Kurallar** bölümü: Satış-yasağı bildirimi kartı (mevcut `components/adoptions/sales-ban-banner.tsx` metnini/kalıbını reuse; kalıcı, dismiss YOK — POLICY-01).
- **Yasal** bölümü: Gizlilik (`/pp`), Kullanım Koşulları (`/tos`), İletişim (`mailto:b.cihancengiz@gmail.com`).
- Alt: telif notu (`© {yıl} Patify`).

`lib/feedback/*`:
- `lib/feedback/types.ts`: `FeedbackCategory = 'bug' | 'suggestion' | 'general'` (+ TR label'lar: Hata/Öneri/Genel).
- `lib/feedback/actions.ts` (`'use server'`): **`submitFeedbackAction(category, message): Result`**: getUser gate. INSERT `feedback` açık kolon `{category, message, platform: 'web', app_version: <clamp 40>}` (id/user_id/status/created_at server-controlled — GÖNDERME). **Screenshot web'de KAPSAM DIŞI** (mobil opsiyonel; web'de erteleniyor). Rate-limit sentinel `feedback_create_rate_limit` (mesaj substring) → TR mesaj. `message` boş → `{error:'Mesaj boş olamaz.'}`; clean/trim.
- `components/feedback/feedback-dialog.tsx` (client): kategori seçimi + mesaj (textarea, maxLength makul) → `submitFeedbackAction` → başarı bildirimi + kapat.

**Ayarlar bağlantıları:** `app/(app)/profile/settings/page.tsx`'e "Hakkında" (→/profile/about) ve "Geri bildirim gönder" (FeedbackDialog veya /profile/about) tile'ları ekle. Mevcut `SettingsRow` bileşenini genişlet.

## 7. DM opt-out — `accepts_dms`

`lib/profile/dm-prefs.ts` (veya actions.ts'e ekle):
- **`fetchAcceptsDms(): Promise<boolean>`** (server): getUser → yoksa true. `.from('user_private').select('accepts_dms').eq('user_id', uid).maybeSingle()` → `row?.accepts_dms ?? true` (fail-open, satır yoksa true — mobil paritesi).
- **`setAcceptsDmsAction(value: boolean): Result`** (`'use server'`): getUser gate. `.from('user_private').upsert({user_id: uid, accepts_dms: value})` (satır yoksa oluştur).
- **Ayarlar tile'ı** (`components/settings/accept-dms-toggle.tsx`, client): toggle, mevcut değeri server'dan (settings page) alır, değişince `setAcceptsDmsAction`. Başlık "Mesajlara izin ver", açıklama mobil `settings_accept_dms_desc` paritesi. Not: DM/Chat henüz web'de yok (Chats fazı) — toggle bu tercihi önden ayarlar; `can_dm` RPC'si Chats fazında kullanılacak.

## 8. Security / KVKK

- Tüm write'lar **session-authoritative** (`user_id`/`reporter` getUser'dan). `reportAction`/`submitFeedbackAction`/`setAcceptsDmsAction` client input'tan user_id ALMAZ.
- `reports`/`feedback`/`user_private` insert/upsert **açık kolon**; `.select('*')` YASAK; sadece gereken döner (`.select('id')` veya void).
- `feedback` status/user_id/created_at server-controlled (column GRANT) — gönderme.
- Trust read-only; UUID-guard 22P02'yi önler.
- Share/mailto URL'leri sabit/kendi origin'imiz — kullanıcı verisi URL'e konmaz.

## 9. Constraints (F0-Emergency'den taşınır)

- main'e commit YOK; push/deploy YOK; **migration YOK** (§2 — tüm tablolar/enum'lar/RPC'ler canlı DB'de, mobil kanıtı).
- Reads = RPC `.returns<>()` (trust). Writes = açık kolon, session-auth. `database.types.ts` DEĞİŞTİRME.
- Untyped client → string enum değerleri derlenir; runtime 22P02 = fail-loud DUR sinyali.
- Test runner yok → `npm run build`/`tsc --noEmit` otoritatif. Bayat LSP (2307/2724/6385/71007) false-alarm.
- Login-gated yüzeyler `(app)` altında; public `/lost-found/item/[id]`'de report login gerektirir, share gerektirmez.
- Mevcut UI kalıplarını KULLAN (SettingsRow, dropdown-menu, dialog, inline banner — toast yok). Yeni tasarım dili İCAT ETME.

## 10. Success criteria

1. `reportAction` session-auth insert (`reports`, açık kolon); `hasReportedAction` doğru.
2. EntityActionMenu emergency/adoptions/lost-found detayında; Şikayet non-owner'a, Paylaş herkese; Emergency'nin DEFERRED Report yorumu kaldırıldı.
3. Şikayet-neden dialog'u 8 ReportType, TR label; başarı/hata gösterimi.
4. Trust flags UUID-guard'lı toplu çekim; rozet profil başlığı + kartlarda; trust-progress paneli kendi profilinde.
5. About sayfası: header+sürüm, Paylaş/Değerlendir/Geri bildirim, sales-ban kartı, legal linkler, iletişim, telif.
6. Feedback: `submitFeedbackAction` session-auth (`feedback`, platform 'web', server-controlled kolonları göndermez), rate-limit mesajı; dialog kategori+mesaj.
7. DM opt-out: `fetchAcceptsDms` fail-open true; `setAcceptsDmsAction` upsert; ayarlar toggle.
8. Ayarlara Hakkında + Geri bildirim tile'ları eklendi.
9. `npm run build` temiz; `database.types.ts` değişmedi; `.select('*')` yok; migration yok.
10. Runtime enum/insert doğrulaması test kimliği gerektirir (fail-loud); 22P02 çıkarsa DUR.
