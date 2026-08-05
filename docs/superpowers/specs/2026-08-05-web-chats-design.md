# Web Chats (Direct Messaging) — Design Spec

**Date:** 2026-08-05
**Program:** Patify mobil→web parite. **SON faz** = Chats/Mesajlaşma (mobil Inbox → Mesajlar).
**Branch:** `feat/web-chats` · base `main@fa8e2b5`

## 1. Overview / Goal

Mobil doğrudan mesajlaşmayı web'e taşı: sohbet listesi (inbox), sohbet odası (metin + resim mesajları, realtime), bir kullanıcıyla sohbet başlatma (DM gate'li), ve bekleyen DM CTA'larını (Emergency/LF/Adoptions/Profil) bağlama.

**Mimari kararı (önemli, dokümante):** Chat reads/writes **client-side** bir `ChatRepository` üzerinden **browser client** (`lib/supabase/client.ts`) ile yapılır — diğer web fazlarının "writes=Server Action" normundan bilinçli sapma. Gerekçe: (a) realtime doğası gereği client-side, (b) chat güvenliği **RLS'te** yaşar (`chats/CLAUDE.md`: "Security lives in the schema's RLS"), (c) mobil `chat_repository.dart` ile 1:1. `authorId`/`userIds` oturum kullanıcısından; RLS sunucuda doğrular (mobil paritesi). Modül dokümanı: mobil `lib/features/chats/CLAUDE.md`.

## 2. `chats` şeması + kritik kısıtlar

- Chat verisi **`public`'te DEĞİL**, ayrı `chats` şemasında: `rooms`, `messages`. Web: `supabase.schema('chats').from('rooms'|'messages')`. Şema API'de expose (mobil aynı anon key ile kullanıyor → kanıt).
- **bigint id → string** (Dart/web'de string), **epoch-ms bigint timestamp** (number).
- **Trigger'lar `status` + `rooms.lastMessages`'ı tutar — client ASLA yazmaz** (`set_message_status_to_sent`, `update_last_messages`).
- **RLS güvenlik sınırıdır** (is_chat_member, no_block_in_room, rooms_grant_create=DM gate). Client RLS'i yeniden uygulamaz.
- **migration YOK** (tablolar/trigger/RPC/publication canlı DB'de, mobil kullanıyor). Runtime doğrulaması test kimliği gerektirir (fail-loud); `.schema('chats')` erişimi/publication canlı-DB gerçeği (mobil parite doğruluyor).

## 3. Scope & Deferrals

**KAPSAM:** inbox (oda listesi realtime-refresh + unread + son-mesaj + karşı kullanıcı), oda sayfası (mesaj listesi realtime + metin gönder + resim gönder + markSeen), start-chat (`findOrCreateDirectRoom` + `can_dm` gate), DM CTA wiring (profil/LF/adoptions/emergency), deleteRoom (sohbeti sil), resim yükleme+gösterim (signed URL).

**ERTELENDİ (fail-loud):** **presence** (online/son-görülme — ayrı 3. realtime kanalı), typing göstergesi, grup sohbetleri (yalnız `direct`), `mark_chat_notifications_read` entegrasyonu (Notifications rozeti ayrı — opsiyonel bağlanabilir, çekirdek değil).

## 4. Data model — `lib/chats/types.ts`

```ts
export type ChatMessageStatus = 'sending' | 'sent' | 'seen';
export type ChatMessage = {
  id: string; roomId: string; authorId: string;
  createdAt: number; updatedAt: number; status: ChatMessageStatus;
} & (
  | { type: 'text'; text: string }
  | { type: 'image'; uri: string; width: number | null; height: number | null; name: string | null; size: number | null }
);
export type ChatRoom = {
  id: string; userIds: string[]; type: string;
  createdAt: number; updatedAt: number; lastMessage: ChatMessage | null;
};
```
- `mapRowToMessage(row)`: `id/roomId`→string; `createdAt/updatedAt` num→number (updatedAt yoksa createdAt); `status` 'seen'/'sending'/else→'sent'; `type==='image'`→image variant (uri??'' , width/height num|null, name, size), aksi→text variant (text??''). Bozuk satır throw ETMEZ (mobil parite).
- `mapRowToRoom(row)`: id→string; `userIds`→string[]; `type`??'direct'; createdAt/updatedAt num; `lastMessages` jsonb dizi ise element[0]→`mapRowToMessage` (aynı camelCase şekil), yoksa null.
- `otherUserId(room, currentUserId)`: `userIds` içinde current olmayan ilk id (yoksa current).
- `messagePreview(m)`: text ise text, image ise `null` (UI "📷 Fotoğraf" gösterir).

## 5. Client repository — `lib/chats/repository.ts` (browser client)

`createChatRepository(currentUserId)` veya sınıf; browser `createClient()`. Mobil `chat_repository.dart` ile 1:1. `schema='chats'`, `bucket='chats_assets'`. `sortedPair(a,b)=[a,b].sort()`.

- `fetchRooms()`: `.schema('chats').from('rooms').select().contains('userIds',[uid]).order('updatedAt',{ascending:false})` → `mapRowToRoom`.
- `fetchUnreadCounts()`: `.schema('chats').rpc('unread_counts_for_current_user')` → `Record<roomId(string), number>` (roomId.toString(), unread_count int). Boş → {}.
- `fetchMessages(roomId)`: `.schema('chats').from('messages').select().eq('roomId',roomId).order('createdAt',{ascending:true})` → `mapRowToMessage[]` (ilk yük; realtime task 3'te).
- `findOrCreateDirectRoom(otherUserId)`: **self-DM → throw** (pre-network guard); `userIds=sortedPair`; SELECT `type='direct' & userIds=pair` limit 1 → varsa döndür; yoksa INSERT `{createdAt:now, updatedAt:now, type:'direct', userIds, imageUrl:null, name:null, userRoles:null}`.select() → döndür; `23505` (yarış) → re-SELECT kazananı. (`status`/`lastMessages` yazma.)
- `hasDirectRoomWith(otherUserId)`: SELECT `id` where `type='direct' & userIds=pair` limit 1 → bool.
- `sendText(roomId, text)`: INSERT `{roomId, authorId:uid, type:'text', text, createdAt:now, updatedAt:now}` (status/lastMessages YOK).
- `sendImage(roomId, {uri, width?, height?, name?, size?})`: INSERT `{roomId, authorId:uid, type:'image', uri, width, height, name, size, createdAt, updatedAt}`.
- `markSeen(roomId, messageId)`: UPDATE `{status:'seen', updatedAt:now}` where roomId & id.
- `deleteRoom(roomId)`: DELETE where id (RLS is_owner/member).
- `uploadRoomImage(roomId, file)`: `chats_assets`'e `${roomId}/${crypto.randomUUID()}-${name}` yükle (contentType), dönüş: depolanan `uri` = `${storage.url}/object/authenticated/${bucket}/${path}` (mobil şekli).
- `signedUrlForMessage(uri)`: resim mesajı gösterimi — private bucket + web `<img>` header gönderemez, o yüzden **signed URL**. `uri` **trusted storage host + chats_assets** işaret ediyorsa path'i çıkar → `.storage.from('chats_assets').createSignedUrl(path, ttl)`; aksi (attacker-controlled uri) → null (render etme). Mobil `imageHeadersFor` token-exfil guard'ının web karşılığı: güvenilmeyen host'a hiçbir şey gönderme.

## 6. Realtime + DM gate — `lib/chats/realtime.ts` + `lib/chats/dm.ts`

`realtime.ts` (browser client):
- `subscribeRooms(onChange)`: `channel('chats:rooms:'+uid).on('postgres_changes',{event:'*',schema:'chats',table:'rooms'}, ()=>onChange()).subscribe()` → **veri taşımaz, "değişti" der, çağıran re-fetch eder** (CLAUDE.md). Dönüş: channel; **cleanup çağıranın** (`supabase.removeChannel`).
- `subscribeMessages(roomId, handlers)`: `channel('chats:messages:'+roomId).on('postgres_changes',{event:'*',schema:'chats',table:'messages',filter:'roomId=eq.'+roomId}, payload=>{...INSERT/UPDATE merge...}).subscribe()`. Notifications provider'daki merge kalıbı (functional setState, id-keyed). Cleanup çağıranın.

`dm.ts`:
- `canDm(targetUserId)`: `.rpc('can_dm',{target:targetUserId})` → bool. **fail-open:** hata/misafir → true (mobil `dm_permission_repo` + sunucu coalesce paritesi).
- `startDirectChat(targetUserId)` akışı (client): `canDm` dene (hata→true); `false` ise `hasDirectRoomWith` (hata→false) — mevcut oda varsa devam, yoksa "DM kapalı" bildirimi. Sonra `findOrCreateDirectRoom` → `/chats/{roomId}`'e yönlen. (Mobil `_onDmPressed` / `lost_found_detail` DM gate paritesi.)

## 7. UI

- **`/chats` (`app/(app)/chats/page.tsx` — stub'ı değiştir):** client inbox. `fetchRooms` (ilk yük server veya client) + `subscribeRooms`→re-fetch + `fetchUnreadCounts`. Her oda: karşı kullanıcı (`otherUserId`→`lib/profile/public.ts` ile profil, batch), avatar+ad, `lastMessage` önizleme (text veya "📷 Fotoğraf"), göreli zaman (updatedAt), unread rozeti. Boş durum. Satır tıkla→`/chats/{id}`. Sil (onay→`deleteRoom`).
- **`/chats/[roomId]` (`app/(app)/chats/[roomId]/page.tsx`):** oda. Üyelik guard (RLS zaten korur; sayfa fetchMessages boş/erişimsizde uygun davranır). Mesaj listesi (`fetchMessages` + `subscribeMessages`, artan, en yeni altta, oto-scroll). Karşı kullanıcı başlığı (profil). Composer: metin input + gönder (`sendText`, optimistic) + resim ekle. Görünen karşı-taraf mesajlarını `markSeen`. Kendi mesajları sağ, karşı sol; status (sent/seen) kendi mesajında.
- **Resim mesajı:** composer'da resim seç → `uploadRoomImage` → `sendImage`. Gösterim: `signedUrlForMessage(uri)` ile `<img>` (null ise gösterme/placeholder). Yükleme sırasında optimistic/pending.
- **Nav:** `/chats` (Sohbet) nav öğesi zaten var — değişmez.

## 8. DM CTA wiring (bekleyen ertelemeleri aç)

`components/chats/message-user-button.tsx` (client): props `{ targetUserId, currentUserId }`. Tıkla→`startDirectChat` akışı (§6). 
- **Emergency detay** (`components/emergency/emergency-actions.tsx`): `// DEFERRED: DM CTA` yorumunu kaldır; `canDm`+dmTargetId mantığı zaten orada (reporter↔claimer) — buton `startDirectChat(dmTargetId)` çağırır.
- **Lost&found detay** (app + public): ilan sahibine "Mesaj" (owner değilse, login'liyse).
- **Adoptions detay**: ilan sahibine "Mesaj" (owner değilse).
- **Profil** (`app/(app)/profile/user/[id]/page.tsx` / user-profile-actions): "Mesaj" butonu (kendisi değilse).

## 9. Security / KVKK

- **RLS güvenlik sınırıdır** — client kapıları UX kolaylığı; sunucu (is_chat_member, no_block_in_room, rooms_grant_create=can_dm) gerçek zorlayıcı. `authorId`/`userIds` oturumdan; RLS doğrular (mobil parite).
- **Resim token-exfil guard:** `signedUrlForMessage` yalnız trusted storage host + chats_assets için signed URL üretir; güvenilmeyen `uri` render edilmez. Bearer token hiçbir yabancı host'a gönderilmez.
- **DM gate fail-open** (mobil parite): ağ hatası kullanıcıyı sessizce ulaşılamaz yapmaz; ama mevcut oda `hasDirectRoomWith` ile korunur.
- `.select('*')` chats tablolarında: chats.rooms/messages'te hassas-revoke kolonu yok (RLS satır-bazlı), `.select()` (tüm kolonlar) mobil ile aynı; yine de yalnız gerekeni map'le. deleteRoom RLS-scoped.
- Trigger-yönetilen `status`/`lastMessages` client tarafından ASLA yazılmaz.

## 10. Constraints (F0-Notifications'tan taşınır)

- main'e commit YOK; push/deploy YOK; **migration YOK**. `database.types.ts` DEĞİŞTİRME (chats şeması orada yok; untyped client + `.schema('chats')` farketmez).
- Realtime + chat ops **browser client**. Cleanup çağıranın (`removeChannel`).
- Trigger'lar status/lastMessages tutar — YAZMA. self-DM guard pre-network throw. 23505 race handle.
- Test runner yok → `npm run build`/`tsc --noEmit` otoritatif. Realtime + `.schema('chats')` + resim runtime test kimliği gerektirir (fail-loud). Bayat LSP false-alarm.

## 11. Success criteria

1. `/chats` inbox: rooms realtime-refresh (subscribeRooms→re-fetch), unread rozeti, son-mesaj önizleme (text/📷), karşı kullanıcı profil, sil.
2. `/chats/[roomId]`: mesaj listesi realtime (fetch+subscribe, artan/oto-scroll), metin gönder (optimistic), markSeen, kendi/karşı hizalama + status.
3. Resim: seç→uploadRoomImage→sendImage; gösterim signedUrlForMessage (trusted-host guard; untrusted→render yok).
4. start-chat: canDm fail-open + hasDirectRoomWith istisnası + findOrCreateDirectRoom (self-DM throw, 23505 race) → odaya yönlen.
5. DM CTA'lar bağlandı: emergency (DEFERRED kaldırıldı) + LF + adoptions + profil.
6. `.schema('chats')` erişimi; bigint→string, epoch-ms→number; trigger alanları yazılmaz.
7. Presence/typing/grup ertelendi (fail-loud yorum).
8. `npm run build` temiz; `database.types.ts` değişmedi; migration yok.
9. Realtime/schema/resim runtime doğrulaması test kimliği gerektirir (fail-loud).
