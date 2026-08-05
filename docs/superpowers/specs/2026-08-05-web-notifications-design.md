# Web Notifications (in-app inbox) — Design Spec

**Date:** 2026-08-05
**Program:** Patify mobil→web parite. Bu faz = **Notifications** (uygulama-içi bildirim kutusu). Web'de **ilk Supabase Realtime**.
**Branch:** `feat/web-notifications` · base `main@4981379`

## 1. Overview / Goal

Mobil "Notifications" (Inbox → Bildirimler segmenti) özelliğini web'e taşı: kullanıcının `public.notifications` satırlarını **realtime** listeleyen bir kutu, okunmamış rozeti, oku/tümünü-oku, sil/tümünü-sil. Bildirimler server tarafında (Edge function'lar olaylara tepki olarak) oluşturulur — **web yalnızca OKUR + mark-read + siler**, oluşturmaz.

Kritik teknik fark: Flutter'ın `.stream()` kısayolu supabase-js'te YOK. Web'de realtime = `supabase.channel(...).on('postgres_changes', ...)` + ilk `select()` fetch. Browser client (`lib/supabase/client.ts`, `createBrowserClient`) realtime destekler.

## 2. Scope & Deferrals

**KAPSAM:**
- `/notifications` sayfası: realtime liste (id desc, ≤200), bildirim satırı (type→ikon + depolanan title/body + aktör avatarı [data'dan] + göreli zaman + okundu/okunmadı + `url` varsa tıkla-git), boş durum.
- Okunmamış rozeti: AppShell'de bir zil (bell) ikonu + canlı okunmamış sayısı (client-side `!isRead` sayımı).
- mark-read (satıra tıkla = tekil; "Tümünü okundu işaretle" butonu), sil (tekil + tümünü sil).
- Realtime: INSERT/UPDATE/DELETE payload'ları yerel listeye merge (prepend/replace/remove).

**ERTELENDİ (fail-loud):**
- **OneSignal WEB PUSH** → harici servis (service worker + VAPID/OneSignal Web SDK + anahtarlar). Kullanıcı sağlar (harita key gibi). Bu faz yalnız uygulama-içi kutu.
- **Bildirim ayarları/tercihleri sayfası** (push kanal toggle'ları, nearby-push prefs, match-notify prefs) → hepsi push-bağımlı, push ile birlikte ertelenir.
- **`mark_chat_notifications_read(p_room_id)`** → Chats-bağımlı (oda açılınca çağrılır); Chats fazına ertelenir.

## 3. Data model — `lib/notifications/types.ts`

```ts
export type AppNotification = {
  id: number; category: string; type: string;
  title: string | null; body: string | null; url: string | null;
  data: Record<string, unknown>;
  isRead: boolean; createdAt: string;
  // türetilmiş (data'dan): actorId, actorUsername, actorPhoto
};
```
`NotificationRow` (snake_case, DB satırı = realtime payload.new): `id, category, type, title, body, url, data, is_read, created_at, user_id`. `mapRowToNotification(r)`: snake→camel; `data` obje değilse `{}`; `is_read` → isRead (default false); aktör alanları `data.actor_id/actor_username/actor_photo` (string değilse null — bozuk payload throw etmez). Mobil `app_notification_model.dart` paritesi.

Not: realtime `postgres_changes` payload'u ham DB satırıdır (snake_case), server RPC dönüşü değil — `mapRowToNotification` hem ilk fetch hem realtime payload için kullanılır.

## 4. Read layer — `lib/notifications/read.ts`

- **`fetchNotifications(): Promise<AppNotification[]>`** (server): `getUser()` → yoksa []. `.from('notifications').select('id, category, type, title, body, url, data, is_read, created_at').eq('user_id', user.id).order('id', {ascending:false}).limit(200)` → `mapRowToNotification`. `.select('*')` YASAK (açık kolon — repo disiplini). Hata → [].

## 5. Realtime — `components/notifications/notifications-provider.tsx` (client)

AppShell'i saran client provider (context). CRUX.
- Props: `initial: AppNotification[]` (server'dan ilk fetch), `userId: string`.
- State: `notifications` (initial ile seed), türetilmiş `unreadCount = notifications.filter(!isRead).length`.
- `useEffect`: `createClient()` (browser) → `supabase.channel('notifications:'+userId).on('postgres_changes', { event:'*', schema:'public', table:'notifications', filter: 'user_id=eq.'+userId }, handler).subscribe()`. Cleanup: `supabase.removeChannel(channel)`.
- handler merge (payload.eventType):
  - `INSERT`: `mapRowToNotification(payload.new)` listeye prepend (id'ye göre dedupe, en başa; ≤200 kırp).
  - `UPDATE`: id eşleşen satırı replace (mark-read realtime yansır).
  - `DELETE`: `payload.old.id` listeden çıkar.
- Context değeri: `{ notifications, unreadCount, markRead(ids), markAllRead(), remove(ids), removeAll() }` — mutasyonlar action'ları çağırır + **optimistic** yerel state günceller (realtime UPDATE/DELETE de gelir, id-idempotent merge çift-uygulamayı zararsız kılar).
- `useNotifications()` hook context'i verir. Provider dışında güvenli default (boş) döner ki SSR/erken render patlamasın.

Retry: subscribe `status==='CHANNEL_ERROR'|'TIMED_OUT'` olursa sınırlı yeniden dene (≤3, mobil `retryRealtimeInbox` paritesi) — basit bir yeniden-subscribe. Aşırı mühendislik yok.

## 6. Actions — `lib/notifications/actions.ts` (`'use server'`)

- **`markNotificationsReadAction(ids: number[])`**: getUser gate; ids boş → `{ok:true}`; `.rpc('mark_notifications_read', {p_ids: ids})`. RLS satırları sahibe kilitler.
- **`markAllNotificationsReadAction()`**: getUser gate; `.rpc('mark_all_notifications_read')`.
- **`deleteNotificationsAction(ids: number[])`**: getUser gate; ids boş → `{ok:true}`; `.from('notifications').delete().in('id', ids)` (RLS notifications_delete_own sahibe kilitler; ekstra user_id filtresi de eklenebilir defense-in-depth).
- **`deleteAllNotificationsAction()`**: getUser gate; `.from('notifications').delete().eq('user_id', user.id)`.
- Tümü `{ok:true}|{error}`. Mobil `notifications_repo.dart` paritesi.

## 7. Copy — `lib/notifications/copy.ts`

`notificationIcon(type): LucideIcon` — mobil `notification_copy.dart` type→ikon eşlemesinin lucide karşılığı:
- proximity_lost→MapPin; possible_match/chip_match/sighting_chip/adoption_accepted→CheckCircle2; sighting_report→Eye; adoption_application→Home; adoption_rejected→XCircle; listing_comment/post_comment/discussion_comment→MessageSquare; chat_message→MessageCircle; follow→UserPlus; reunion_credit→Heart; **default→Bell**.
Başlık/gövde: **depolanan `n.title`/`n.body`** render edilir (server-populated — Edge fn `p_title`/`p_body` yazıyor). Mobil'in client-side lokalize kopyası web'de gerekmez; depolanan kopya kaynak-doğrudur (push'ta da o gösterildi).

## 8. UI

- **`app/(app)/notifications/page.tsx`** (server): `fetchNotifications()` → `<NotificationsPageClient initial=... />`. Başlık "Bildirimler" + "Tümünü okundu işaretle" + "Tümünü sil" (onaylı). Boş durum.
- **`components/notifications/notification-list.tsx`** (client): `useNotifications()` listesini render; her satır `NotificationTile`. Sayfa açılışında görünen okunmamışları mark-read (mobil parite: bildirim açılınca okunur) — basit: mount'ta `markAllRead` YAPMA (kullanıcı görsün); satıra tıklayınca o okunur. "Tümünü okundu" butonu explicit.
- **`components/notifications/notification-tile.tsx`** (client): ikon (type) + title/body + aktör avatarı (actorPhoto/actorUsername varsa, mevcut `UserAvatar`) + göreli zaman + okunmadıysa vurgu (nokta/arka plan). Tıkla → mark-read + `url` varsa yönlen (internal `router.push`, güvenli path). Sil butonu (tekil).
- **AppShell bell**: `components/notifications/notification-bell.tsx` (client) — `useNotifications().unreadCount` → zil ikonu + rozet (>0 ise), `/notifications`'e link. Desktop üst bar'a (avatar yanı) + mobil için AppShell'e küçük üst bar (logo + zil, yalnız mobilde görünür) eklenir. `NotificationsProvider` AppShell'i (children) sarar; `userId` (app) layout'tan gelir.

## 9. Security / KVKK

- Reads RLS-scoped (kullanıcının kendi `user_id`'si; realtime filter `user_id=eq.<uid>`). `.select('*')` YASAK — açık kolon.
- Actions session-authoritative (getUser). delete RLS `notifications_delete_own` ile sahibe kilitli.
- `url` yönlendirmesi: yalnız internal path (aynı origin) kabul; harici/`javascript:` reddet (mevcut safe-url disiplini). data'daki aktör avatarı anlık görüntü (eski foto kabul edilir — mobil parite).
- Realtime: anon key + RLS; kullanıcı yalnız kendi satırlarını alır (filter + RLS çift kat).

## 10. Constraints (F0-Moderation'dan taşınır)

- main'e commit YOK; push/deploy YOK; **migration YOK** (notifications tablosu + RPC'ler canlı DB'de; `mark_notifications_read`/`mark_all_notifications_read` mobil kullanıyor). `database.types.ts` DEĞİŞTİRME (notifications tablosu içinde olabilir; untyped client farketmez).
- Realtime **browser client** (`lib/supabase/client.ts`) — server client değil. Provider client component.
- Unread count client-side (`!isRead` say — mobil parite; badge RPC'si YOK).
- OneSignal push ertelenir (anahtar = kullanıcı işi, fail-loud).
- Test runner yok → `npm run build`/`tsc --noEmit` otoritatif. Realtime runtime test kimliği + canlı olay gerektirir (fail-loud).

## 11. Success criteria

1. `/notifications` realtime liste (≤200 id desc); INSERT/UPDATE/DELETE canlı merge; kanal unmount'ta temizlenir.
2. Okunmamış rozeti (bell) canlı sayı; >0'da görünür; /notifications'e link.
3. mark-read (tekil tıklama + tümü) `mark_notifications_read`/`mark_all_notifications_read`; sil (tekil + tümü) RLS-scoped.
4. Tile: type→ikon, depolanan title/body, aktör avatarı, göreli zaman, okunmadı vurgusu, url güvenli yönlendirme.
5. mapRowToNotification hem ilk fetch hem realtime payload için; bozuk data throw etmez.
6. Reads RLS + açık kolon (`.select('*')` yok); actions session-auth.
7. OneSignal push + prefs sayfası + mark_chat_notifications_read ertelendi (fail-loud kod yorumu).
8. `npm run build` temiz; `database.types.ts` değişmedi; migration yok.
9. Realtime runtime doğrulaması test kimliği + canlı olay gerektirir (fail-loud).
