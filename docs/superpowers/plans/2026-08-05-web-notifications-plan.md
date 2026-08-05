# Web Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Uygulama-içi realtime bildirim kutusunu web'e taşı — `/notifications` liste + bell rozeti + oku/sil. Web'de ilk Supabase Realtime. OneSignal push ERTELENDİ.

**Architecture:** Reads = server `select()` (RLS-scoped, açık kolon). Realtime = browser client `channel().on('postgres_changes')` (client provider). Writes = Server Action (RPC mark-read + RLS-scoped delete). Spec: `docs/superpowers/specs/2026-08-05-web-notifications-design.md`.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, `@supabase/ssr` (browser client for realtime), lucide-react.

## Global Constraints

- main'e commit YOK; push/deploy YOK; **migration YOK** (notifications tablosu + mark_notifications_read/mark_all_notifications_read canlı DB'de, mobil kullanıyor). `database.types.ts` DEĞİŞTİRME.
- Realtime = **browser client** (`lib/supabase/client.ts`), server client değil. Provider `'use client'`.
- Web notifications SADECE okur/mark-read/siler — OLUŞTURMAZ (Edge fn'ler oluşturur).
- Reads açık kolon; **`.select('*')` YASAK**. Actions session-authoritative (getUser). delete RLS `notifications_delete_own`.
- title/body **server-populated** → depolanan kopyayı render et; type→ikon lucide eşlemesi. 14 lokalizasyon string'i GEREKMEZ.
- Unread count client-side (`!isRead` say). OneSignal push + prefs sayfası + mark_chat_notifications_read ERTELENDİ (fail-loud yorum).
- `url` yönlendirmesi yalnız internal path (harici/javascript: reddet).
- Test runner yok → her task sonu `npm run build` temiz. Realtime runtime test kimliği gerektirir (fail-loud). Bayat LSP (2307/2724/6385/71007) false-alarm. Commit: açık `git add <paths>`.

**Mobil kaynak:** `IdeaProjects/patify/lib/features/notifications/{services/notifications_repo.dart, models/app_notification_model.dart, utils/notification_copy.dart, states/notifications_pods.dart}`.
**Web şablonları:** `lib/emergency/{read,actions}.ts` (read/action kalıbı), `lib/supabase/client.ts` (browser client), `components/app-shell/app-nav.tsx` (AppShell), `components/user/user-avatar.tsx`.

---

### Task 1: Types + copy + read

**Files:** Create `lib/notifications/types.ts`, `lib/notifications/copy.ts`, `lib/notifications/read.ts`

**Interfaces (Produces):** `AppNotification`, `NotificationRow`, `mapRowToNotification(r)`, `notificationIcon(type)`, `fetchNotifications()`.

- [ ] **Step 1:** `types.ts` — `AppNotification {id:number, category, type:string, title/body/url: string|null, data: Record<string,unknown>, isRead:boolean, createdAt:string}`. `NotificationRow` (snake: is_read, created_at, user_id, data). `mapRowToNotification(r)`: snake→camel, `data` obje değilse `{}`, is_read→isRead (??false), createdAt=created_at. Aktör getter'ları gerekmez ama `actorId/actorUsername/actorPhoto` helper'ları (data['actor_id'/…] string değilse null) export et — tile kullanır. Bozuk data THROW ETMEZ.
- [ ] **Step 2:** `copy.ts` — `notificationIcon(type: string): LucideIcon` spec §7 eşlemesi (proximity_lost→MapPin, possible_match/chip_match/sighting_chip/adoption_accepted→CheckCircle2, sighting_report→Eye, adoption_application→Home, adoption_rejected→XCircle, listing_comment/post_comment/discussion_comment→MessageSquare, chat_message→MessageCircle, follow→UserPlus, reunion_credit→Heart, default→Bell). lucide-react import.
- [ ] **Step 3:** `read.ts` — `fetchNotifications()` (server): getUser→[]; `.from('notifications').select('id, category, type, title, body, url, data, is_read, created_at').eq('user_id', user.id).order('id',{ascending:false}).limit(200)` → map. `.select('*')` YASAK. Hata→[].
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add lib/notifications/types.ts lib/notifications/copy.ts lib/notifications/read.ts && git commit -m "feat(notifications): types + copy + read layer"`

---

### Task 2: Actions

**Files:** Create `lib/notifications/actions.ts`

**Interfaces (Consumes):** Task 1. **(Produces):** `markNotificationsReadAction(ids)`, `markAllNotificationsReadAction()`, `deleteNotificationsAction(ids)`, `deleteAllNotificationsAction()`.

- [ ] **Step 1:** `actions.ts` (`'use server'`, `lib/emergency/actions.ts` kalıbı):
  - `markNotificationsReadAction(ids: number[])`: getUser gate; `ids.length===0`→`{ok:true}`; `.rpc('mark_notifications_read',{p_ids:ids})`; hata→console.error+`{error:'İşlem başarısız, tekrar dene.'}`; `{ok:true}`.
  - `markAllNotificationsReadAction()`: getUser gate; `.rpc('mark_all_notifications_read')`.
  - `deleteNotificationsAction(ids:number[])`: getUser gate; boş→`{ok:true}`; `.from('notifications').delete().in('id',ids).eq('user_id',user.id)` (RLS + defense-in-depth).
  - `deleteAllNotificationsAction()`: getUser gate; `.from('notifications').delete().eq('user_id',user.id)`.
- [ ] **Step 2:** `npm run build` temiz.
- [ ] **Step 3:** Commit `git add lib/notifications/actions.ts && git commit -m "feat(notifications): mark-read/delete actions"`

---

### Task 3: Realtime provider (CRUX)

**Files:** Create `components/notifications/notifications-provider.tsx`

**Interfaces (Consumes):** Task 1 (`AppNotification`, `mapRowToNotification`), Task 2 (actions). **(Produces):** `NotificationsProvider`, `useNotifications()`.

- [ ] **Step 1:** `notifications-provider.tsx` (`'use client'`):
  - Props `{ initial: AppNotification[]; userId: string; children }`.
  - `useState<AppNotification[]>(initial)`; `unreadCount = notifications.filter(n=>!n.isRead).length`.
  - `useEffect([userId])`: `const supabase = createClient()` (browser); `const channel = supabase.channel('notifications:'+userId).on('postgres_changes', {event:'*', schema:'public', table:'notifications', filter:`user_id=eq.${userId}`}, (payload)=>{...}).subscribe()`. Cleanup: `supabase.removeChannel(channel)`.
  - handler by `payload.eventType`: INSERT → `mapRowToNotification(payload.new)` prepend (dedupe by id, cap 200); UPDATE → replace by id; DELETE → filter out `payload.old.id`. Use functional setState to avoid stale closure.
  - Context: `{ notifications, unreadCount, markRead(ids:number[]), markAllRead(), remove(ids), removeAll() }`. Mutations: optimistic local update THEN call the corresponding action (realtime UPDATE/DELETE also arrives — id-keyed merge makes double-apply harmless). markRead sets isRead=true locally for ids; markAllRead sets all; remove filters; removeAll clears.
  - `useNotifications()`: `useContext`; provider dışında güvenli boş default (notifications:[], unreadCount:0, no-op fns) döndür (SSR/erken render patlamasın).
  - Retry: subscribe callback `status` 'CHANNEL_ERROR'|'TIMED_OUT' ise ≤3 kez yeniden subscribe (basit sayaç). Aşırı mühendislik yok.
- [ ] **Step 2:** `npm run build` temiz (71007 provider onChange = editor-only).
- [ ] **Step 3:** Commit `git add components/notifications/notifications-provider.tsx && git commit -m "feat(notifications): realtime provider (channel postgres_changes)"`

---

### Task 4: Notifications page + list + tile

**Files:** Create `app/(app)/notifications/page.tsx`, `components/notifications/notification-list.tsx`, `components/notifications/notification-tile.tsx`

**Interfaces (Consumes):** Task 1 read/copy, Task 3 `useNotifications`, `components/user/user-avatar.tsx`.

- [ ] **Step 1:** `notification-tile.tsx` (client): props `{ n: AppNotification }`. `notificationIcon(n.type)` ikon; aktör avatarı (actorPhoto/actorUsername varsa `UserAvatar`, yoksa ikon); title (n.title) + body (n.body); göreli zaman (createdAt — basit "x önce" veya locale tarih); okunmadıysa görsel vurgu (sol nokta/bg). Tıkla → `useNotifications().markRead([n.id])` + `n.url` varsa internal path ise `router.push(n.url)` (harici/`javascript:` reddet — startsWith('/') kontrolü). Sil butonu → `remove([n.id])`.
- [ ] **Step 2:** `notification-list.tsx` (client): `useNotifications()` → liste; boşsa boş durum; her satır `NotificationTile`. Üstte "Tümünü okundu işaretle" (`markAllRead`) + "Tümünü sil" (onay sonra `removeAll`) butonları (unreadCount/liste boşsa uygun disable).
- [ ] **Step 3:** `page.tsx` (server): `fetchNotifications()` → başlık "Bildirimler" + `<NotificationList />`. (Provider AppShell'de; sayfa initial'ı Task 5'te provider'a besleniyor — bu sayfa provider'ın listesini `useNotifications` ile okur. NOT: provider initial'ı layout'ta fetch edildiği için burada ekstra fetch'e gerek yoksa da, sayfa server-render'da provider'dan bağımsız ilk içerik gösteremez; en temiz: provider initial'ını layout besler, bu sayfa `NotificationList`'i render eder. Eğer provider Task 5'te layout'a ekleniyorsa page yalnız `<NotificationList/>` render eder.)
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add "app/(app)/notifications/page.tsx" components/notifications/notification-list.tsx components/notifications/notification-tile.tsx && git commit -m "feat(notifications): page + list + tile"`

---

### Task 5: Bell + AppShell wiring

**Files:** Create `components/notifications/notification-bell.tsx`; Modify `components/app-shell/app-nav.tsx` (AppShell), `app/(app)/layout.tsx`

**Interfaces (Consumes):** Task 3 provider, Task 1 read.

- [ ] **Step 1:** `app/(app)/layout.tsx`: mevcut getUser/username akışına ek olarak `userId` + `fetchNotifications()` initial'ını al, `<AppShell username userId initialNotifications={...}>` olarak geç. (Layout zaten server; getUser var.)
- [ ] **Step 2:** `app-nav.tsx` (AppShell): `NotificationsProvider`'ı `children`'ı saracak şekilde ekle (props: userId, initial). `notification-bell.tsx`'i **desktop üst bar'a** (avatar yanı) ekle. Mobil için: AppShell'e yalnız-mobilde görünen küçük bir üst bar (logo/başlık + `NotificationBell`) ekle (`md:hidden`), böylece mobil kullanıcı zile erişir. Alt tab bar (5 öğe) DEĞİŞMEZ.
- [ ] **Step 3:** `notification-bell.tsx` (client): `useNotifications().unreadCount` → `Bell` ikonu + rozet (count>0 ise, 99+ kırp), `<Link href="/notifications">`.
- [ ] **Step 4:** `npm run build` temiz (route +1: /notifications).
- [ ] **Step 5:** Commit `git add components/notifications/notification-bell.tsx components/app-shell/app-nav.tsx "app/(app)/layout.tsx" && git commit -m "feat(notifications): bell + unread badge + AppShell provider wiring"`

---

## Self-Review

- **Spec coverage:** §3 types→T1, §4 read→T1, §5 realtime→T3, §6 actions→T2, §7 copy→T1, §8 UI→T4/T5. §11 kriterleri T1-T5'e dağıldı. ✅
- **Placeholder yok:** realtime channel API, merge mantığı, RPC adları explicit. ✅
- **Tip tutarlılığı:** AppNotification/NotificationRow T1'de; provider+page+tile aynı tipleri kullanır; mapRowToNotification hem fetch hem realtime payload için. ✅
- **Güvenlik:** reads RLS+açık kolon; actions session-auth; realtime filter user_id; url internal-only. ✅
- **Crux (T3):** channel lifecycle + cleanup + functional setState + id-keyed merge + retry — açıkça belirtildi. İmplementer zorlanırsa daha güçlü modele yükselt (Model Selection).
