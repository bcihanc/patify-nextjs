# Web Moderation + Trust + About/Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Reports (moderasyon) + Trust + About/Feedback + DM opt-out'u web'e taşı. Web'de zaten olan (change-password/blocked-list/analytics/export/delete/legal) DOKUNULMAZ.

**Architecture:** Writes = Server Action (açık kolon, session-auth, untyped client). Reads = RPC `.returns<>()` (trust). UI: `lib/{reports,trust,feedback}/*`, `components/{shared,trust,feedback,settings}/*`, `app/(app)/profile/about/*`, mevcut detay/settings sayfalarına wiring. Spec: `docs/superpowers/specs/2026-08-05-web-moderation-trust-design.md`.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, Supabase `@supabase/ssr` (untyped client), lucide-react, shadcn/ui.

## Global Constraints

- main'e commit YOK; push/deploy YOK; **migration YOK** (reports enum'ları + `accepts_dms` + trust RPC'leri canlı DB'de var — mobil kanıtı; web `database.types.ts` bilinçli bayat, DEĞİŞTİRME).
- Untyped client (`createServerClient` generic'siz) → string enum değerleri/olmayan kolonlar derlenir. **Fail-loud:** runtime `22P02` (invalid enum) = değer canlı DB'de yok → DUR.
- Writes = açık kolon; `.select('*')` YASAK; `user_id`/`reporter`/`reporter_user_id` **session-authoritative** (getUser, asla client'tan). Server-controlled kolonları (feedback status/user_id/created_at) GÖNDERME.
- Reads (trust) = `.rpc(name).returns<Row[]>()`. UUID-guard (regex) `trusted_member_flags`'te.
- Enum'lar mobil ile byte-exact: SupabaseEntity (10 değer), ReportType (8), FeedbackCategory (bug/suggestion/general), TrustProgress/TrustSignals şekli.
- Mevcut UI kalıpları: `SettingsRow`, `components/ui/dropdown-menu`, dialog primitifleri, inline banner (toast YOK). Yeni tasarım dili icat etme.
- Login-gated yüzeyler `(app)` altında; public `/lost-found/item/[id]`'de Şikayet login gerektirir, Paylaş gerektirmez.
- Test runner yok → her task sonu `npm run build` temiz. Commit: açık `git add <paths>` (asla `-am`/`-A`).

**Mobil kaynak (referans):** `IdeaProjects/patify/lib/features/reports/{data/reports_repo.dart,models/reports_models.dart}`, `.../trust/{data/trust_repo.dart,models/trust_models.dart}`, `.../feedback/{data/feedback_repo.dart,models/feedback_models.dart}`, `.../about/about_page.dart`, `.../chats/services/dm_permission_repo.dart`.
**Web şablonları:** `lib/adoptions/actions.ts` (action kalıbı), `lib/emergency/read.ts` (RPC `.returns<>`), `components/adoptions/sales-ban-banner.tsx` (sales-ban), `app/(app)/profile/settings/page.tsx` + `SettingsRow`, `components/user/{profile-header,user-list-row}.tsx`.

---

### Task 1: Reports lib (types + actions)

**Files:** Create `lib/reports/types.ts`, `lib/reports/actions.ts`

**Interfaces (Produces):** `SupabaseEntity`, `ReportType`, `REPORT_TYPE_LABELS`, `reportAction(entity, entityId, type)`, `hasReportedAction(entity, entityId)`.

- [ ] **Step 1:** `lib/reports/types.ts` — `SupabaseEntity` (10 değer: posts, post_comments, discussion, discussion_answers, discussion_answer_comments, adoptions, adoption_comments, lost_found, lost_found_sightings, emergency), `ReportType` (8: spam, harassment, hate_speech, violence, nudity, false_information, sale_commercial_content, other), `REPORT_TYPE_LABELS` (TR: Spam/Taciz/Nefret söylemi/Şiddet/Müstehcenlik/Yanlış bilgi/Satış-ticari içerik/Diğer). Byte-exact mobil `reports_models.dart`.
- [ ] **Step 2:** `lib/reports/actions.ts` (`'use server'`) — `reportAction`: getUser gate; INSERT `reports` `{entity, entity_id: entityId, type, user_id: user.id}`; hata→console.error+`{error:'Şikayet gönderilemedi, tekrar dene.'}`; `{ok:true}`. `hasReportedAction`: getUser→false; `.from('reports').select('id').eq('entity',entity).eq('entity_id',entityId).eq('user_id',user.id).maybeSingle()` → `!!data`.
- [ ] **Step 3:** `npm run build` temiz.
- [ ] **Step 4:** Commit `git add lib/reports/types.ts lib/reports/actions.ts && git commit -m "feat(reports): types + report/hasReported actions"`

---

### Task 2: Action menu + report dialog + share; wire emergency

**Files:** Create `lib/share.ts`, `components/shared/entity-action-menu.tsx`, `components/shared/report-dialog.tsx`; Modify `components/emergency/emergency-actions.tsx`

**Interfaces (Consumes):** Task 1. **(Produces):** `shareOrCopy(url, text?)`, `EntityActionMenu`, `ReportDialog`.

- [ ] **Step 1:** `lib/share.ts` — `shareOrCopy(url: string, text?: string)`: `navigator.share` varsa `{title/text/url}`, yoksa `navigator.clipboard.writeText(url)` + `true` (kopyalandı sinyali). SSR-safe (client'tan çağrılır).
- [ ] **Step 2:** `components/shared/report-dialog.tsx` (client): props `{entity, entityId, open, onOpenChange}`; `REPORT_TYPE_LABELS`'tan 8 seçenek (radio/list), Gönder → `reportAction` → başarı→kapat + inline "Şikayetin alındı"; hata→inline. `components/ui/dialog` (varsa; yoksa mevcut modal kalıbı).
- [ ] **Step 3:** `components/shared/entity-action-menu.tsx` (client): props `{entity, entityId, isOwner, shareUrl?, shareText?}`. `components/ui/dropdown-menu`: "Paylaş" (herkes→`shareOrCopy`), "Şikayet et" (`!isOwner`→ReportDialog aç). `hasReportedAction` ile zaten şikayet edildiyse "Şikayet edildi" pasif.
- [ ] **Step 4:** `components/emergency/emergency-actions.tsx`: `// DEFERRED: Report` yorumunu kaldır; detay başlık/aksiyon alanına `<EntityActionMenu entity="emergency" entityId={caseId} isOwner={isReporter} shareUrl=.../>` ekle (non-reporter'a Şikayet görünür). Not: emergency-actions client bileşeni; entityId=caseId, isOwner=isReporter. Konumlandırmayı bozmadan ekle.
- [ ] **Step 5:** `npm run build` temiz.
- [ ] **Step 6:** Commit `git add lib/share.ts components/shared/entity-action-menu.tsx components/shared/report-dialog.tsx components/emergency/emergency-actions.tsx && git commit -m "feat(reports): action menu + report dialog + share; wire emergency"`

---

### Task 3: Wire report menu into adoptions + lost-found

**Files:** Modify adoptions detay (`app/(app)/adoptions/[id]/page.tsx` ve/veya `components/adoptions/adoption-owner-actions.tsx`), lost-found detay sayfa(lar)ı.

**Interfaces (Consumes):** Task 2 `EntityActionMenu`.

- [ ] **Step 1:** Adoptions detay: non-owner'a `<EntityActionMenu entity="adoptions" entityId={id} isOwner={isOwner} shareUrl=.../>` ekle. `isOwner` = `currentUserId === listing.userId`. Owner zaten owner-actions görüyor; menü owner'a Paylaş-only.
- [ ] **Step 2:** Lost&found detay: mevcut detay sayfalarını bul (`app/lost-found/item/[id]/page.tsx` public + varsa `(app)/lost-found/[id]`). Her birine `<EntityActionMenu entity="lost_found" entityId={id} isOwner={...} shareUrl=.../>` ekle. Public sayfada logged-out → menü Şikayet'i gizler (isOwner irrelevant; login yoksa yalnızca Paylaş). Bunu EntityActionMenu içinde `currentUserId` prop'u null ise Şikayet gizlenerek çöz (Task 2 menüsüne `currentUserId?: string | null` ekle gerekiyorsa — minimal genişletme).
- [ ] **Step 3:** `npm run build` temiz.
- [ ] **Step 4:** Commit `git add "app/(app)/adoptions/[id]/page.tsx" <lost-found detail paths> [components/...] && git commit -m "feat(reports): wire action menu into adoptions + lost-found detail"`

---

### Task 4: Trust lib (types + read + actions)

**Files:** Create `lib/trust/types.ts`, `lib/trust/read.ts`, `lib/trust/actions.ts`

**Interfaces (Produces):** `TrustSignals`, `TrustProgress`, `fetchTrustFlags(ids)`, `fetchMyTrustProgress()`, `myTrustProgressAction()`.

- [ ] **Step 1:** `lib/trust/types.ts` — `TrustSignals {photo, bio: boolean; listings, reunions, chats: number}`, `TrustProgress {isTrusted, ageOk, cleanOk, hasSignal: boolean; signals: TrustSignals; daysSinceSignup: number}`. Byte-exact mobil.
- [ ] **Step 2:** `lib/trust/read.ts` (server): `fetchTrustFlags(ids: string[]): Promise<Record<string,boolean>>` — boş→`{}`; UUID regex `^[0-9a-fA-F]{8}-...$`; non-UUID id'ler default false, wire'a gitmez; `.rpc('trusted_member_flags',{p_ids:castable}).returns<{user_id:string;is_trusted:boolean}[]>()`; eksik→false. `fetchMyTrustProgress(): Promise<TrustProgress>` — `.rpc('my_trust_progress').returns<...>()` veya `.single()`; null/hata→tümü-false default (TrustSignals default'larıyla).
- [ ] **Step 3:** `lib/trust/actions.ts` (`'use server'`): `myTrustProgressAction()` (getUser gate → fetchMyTrustProgress).
- [ ] **Step 4:** `npm run build` temiz (2307/6385 = bayat LSP; tsc/build otoritatif).
- [ ] **Step 5:** Commit `git add lib/trust/types.ts lib/trust/read.ts lib/trust/actions.ts && git commit -m "feat(trust): types + trust-flags/progress RPC wrappers"`

---

### Task 5: Trust badge + progress panel

**Files:** Create `components/trust/trust-badge.tsx`, `components/trust/trust-progress-panel.tsx`; Modify `components/user/profile-header.tsx`, `components/user/user-list-row.tsx`, `app/(app)/profile/page.tsx` (+ user profil sayfası `app/(app)/profile/user/[id]/page.tsx`).

**Interfaces (Consumes):** Task 4.

- [ ] **Step 1:** `components/trust/trust-badge.tsx`: `TrustBadge({trusted}: {trusted: boolean})` — trusted ise "Güvenilir üye" küçük rozet (lucide `BadgeCheck`/`ShieldCheck`, mevcut badge sınıf kalıbı), değilse `null`.
- [ ] **Step 2:** Rozeti **kullanıcı yüzeylerine** ekle (listing kartlarına DEĞİL — kapsam dışı): `profile-header.tsx` (kullanıcı adı yanı) + `user-list-row.tsx` (followers/followings satırı). Trusted flag'i server tarafında `fetchTrustFlags` ile toplu çek: profil sayfaları tek kullanıcı → `fetchTrustFlags([id])`; followers/followings listesi → tüm id'ler tek çağrı. Prop olarak `trusted: boolean` geç.
- [ ] **Step 3:** `components/trust/trust-progress-panel.tsx`: `TrustProgress` alır; sinyalleri gösterir (fotoğraf ✓/✗, bio ✓/✗, listing/reunion/chat sayıları, ageOk/cleanOk, daysSinceSignup). Kendi profil sayfasında (`app/(app)/profile/page.tsx`) `fetchMyTrustProgress()` ile render (yalnızca kendi profilinde).
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit (açık path listesi) `... && git commit -m "feat(trust): badge on user surfaces + own progress panel"`

---

### Task 6: Feedback lib + dialog

**Files:** Create `lib/feedback/types.ts`, `lib/feedback/actions.ts`, `components/feedback/feedback-dialog.tsx`

**Interfaces (Produces):** `FeedbackCategory`, `FEEDBACK_CATEGORY_LABELS`, `submitFeedbackAction(category, message)`, `FeedbackDialog`.

- [ ] **Step 1:** `lib/feedback/types.ts` — `FeedbackCategory = 'bug'|'suggestion'|'general'` + labels (Hata/Öneri/Genel).
- [ ] **Step 2:** `lib/feedback/actions.ts` (`'use server'`): `submitFeedbackAction`: getUser gate; `message` trim boş→`{error:'Mesaj boş olamaz.'}`; INSERT `feedback` `{category, message, platform:'web'}` (app_version opsiyonel; **status/user_id/created_at GÖNDERME** — server-controlled); rate-limit sentinel `feedback_create_rate_limit` (substring)→`{error:'Kısa sürede çok fazla geri bildirim gönderdin, biraz sonra tekrar dene.'}`; `{ok:true}`. Screenshot KAPSAM DIŞI.
- [ ] **Step 3:** `components/feedback/feedback-dialog.tsx` (client): props `{open, onOpenChange}`; kategori seçimi (3, radio/segmented) + mesaj textarea (maxLength 2000) → `submitFeedbackAction` → başarı→kapat+inline "Teşekkürler"; hata→inline.
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add lib/feedback/types.ts lib/feedback/actions.ts components/feedback/feedback-dialog.tsx && git commit -m "feat(feedback): types + submit action + dialog"`

---

### Task 7: About page + settings links

**Files:** Create `app/(app)/profile/about/page.tsx`; Modify `app/(app)/profile/settings/page.tsx`

**Interfaces (Consumes):** Task 1 `shareOrCopy`, Task 6 `FeedbackDialog`, sales-ban kalıbı.

- [ ] **Step 1:** `app/(app)/profile/about/page.tsx` (mobil `about_page.dart` paritesi): Header (Patify + sürüm + açıklama). Uygulama: Paylaş (`shareOrCopy('https://patify.net/app', 'Patify uygulamasını indir')`), Değerlendir (App Store + Play Store linkleri — `components/open-in-app-button.tsx`/`hero.tsx`'teki URL'ler), Geri bildirim (FeedbackDialog aç — client alt-bileşen). Kurallar: sales-ban kartı (`components/adoptions/sales-ban-banner.tsx` metnini reuse; kalıcı, dismiss yok). Yasal: Gizlilik(/pp), Koşullar(/tos), İletişim(mailto:b.cihancengiz@gmail.com). Alt: `© {yıl} Patify`. Paylaş/Feedback client etkileşim → küçük client alt-bileşen(ler).
- [ ] **Step 2:** `settings/page.tsx`: mevcut tile kalıbıyla "Hakkında" (→/profile/about) tile'ı ekle. (Geri bildirim erişimi About içinde; ayrıca istenirse settings'e Geri bildirim tile'ı — About'a yönlendir.)
- [ ] **Step 3:** `npm run build` temiz.
- [ ] **Step 4:** Commit `git add "app/(app)/profile/about/page.tsx" "app/(app)/profile/settings/page.tsx" [client alt-bileşenler] && git commit -m "feat(about): about page + settings link"`

---

### Task 8: DM opt-out toggle

**Files:** Create `lib/profile/dm-prefs.ts` (veya actions.ts'e ekle), `components/settings/accept-dms-toggle.tsx`; Modify `app/(app)/profile/settings/page.tsx`

**Interfaces (Produces):** `fetchAcceptsDms()`, `setAcceptsDmsAction(value)`.

- [ ] **Step 1:** `lib/profile/dm-prefs.ts`: `fetchAcceptsDms(): Promise<boolean>` (server) — getUser→true; `.from('user_private').select('accepts_dms').eq('user_id',uid).maybeSingle()` → `row?.accepts_dms ?? true` (fail-open). `setAcceptsDmsAction(value: boolean)` (`'use server'`): getUser gate; `.from('user_private').upsert({user_id: uid, accepts_dms: value})` → `{ok:true}`/`{error}`.
- [ ] **Step 2:** `components/settings/accept-dms-toggle.tsx` (client): başlangıç değeri prop (server'dan), Switch, değişince `setAcceptsDmsAction` (optimistic + hata rollback). Başlık "Mesajlara izin ver", açıklama "Kapalıyken kimse seninle yeni sohbet başlatamaz".
- [ ] **Step 3:** `settings/page.tsx`: `fetchAcceptsDms()` çağır, "Tercihler" bölümüne `<AcceptDmsToggle initial={...}/>` ekle.
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add lib/profile/dm-prefs.ts components/settings/accept-dms-toggle.tsx "app/(app)/profile/settings/page.tsx" && git commit -m "feat(settings): DM opt-out (accepts_dms) toggle"`

---

## Self-Review

- **Spec coverage:** §3 reports→T1, §4 reports UI→T2/T3, §5 trust→T4/T5, §6 about+feedback→T6/T7, §7 dm→T8. Tüm §10 kriterleri T1-T8'e dağıldı. ✅
- **Placeholder yok:** her step somut; enum değerleri/kolonlar/RPC adları explicit. ✅
- **Tip tutarlılığı:** SupabaseEntity/ReportType T1'de, T2/T3 kullanır; TrustProgress T4'te, T5 kullanır; FeedbackCategory T6. Enum değerleri mobil ile eşleşiyor. ✅
- **Güvenlik:** her write session-auth + açık kolon; server-controlled kolonlar gönderilmiyor; migration yok (§2 gerekçesi). ✅
- **Scope netliği:** trust rozeti user yüzeyleriyle sınırlı (listing kartları hariç); screenshot feedback kapsam dışı; report public LF'de login-gated. ✅
