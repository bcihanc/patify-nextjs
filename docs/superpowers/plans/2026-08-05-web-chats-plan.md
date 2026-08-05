# Web Chats (Direct Messaging) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Doğrudan mesajlaşmayı web'e taşı — inbox + oda (metin+resim, realtime) + start-chat (DM gate) + DM CTA wiring. SON program fazı. Presence ERTELENDİ.

**Architecture:** Chat reads/writes **client-side** `ChatRepository` (browser client, `.schema('chats')`) — realtime doğası + RLS güvenlik sınırı + mobil 1:1. Spec: `docs/superpowers/specs/2026-08-05-web-chats-design.md`. Modül dokümanı: mobil `lib/features/chats/CLAUDE.md`.

**Tech Stack:** Next.js 15 App Router, React 19, TS strict, `@supabase/ssr` (browser client + `.schema('chats')` + realtime), lucide-react.

## Global Constraints

- main'e commit YOK; push/deploy YOK; **migration YOK** (chats şeması/tablo/trigger/RPC/publication canlı DB'de, mobil kullanıyor). `database.types.ts` DEĞİŞTİRME.
- Chat ops **browser client** (`lib/supabase/client.ts`) `.schema('chats')`. Realtime cleanup çağıranın (`removeChannel`).
- **Trigger'lar `status` + `rooms.lastMessages` tutar — client ASLA yazmaz.** self-DM pre-network throw. 23505 (oda yarışı) → re-select.
- **bigint id → string; epoch-ms bigint → number.** RLS güvenlik sınırı (client kapıları UX; sunucu zorlar). `authorId`/`userIds` oturumdan.
- **Resim:** private `chats_assets` → gösterim signed URL; `signedUrlForMessage` yalnız trusted host+bucket için üretir, güvenilmeyen uri→null (token-exfil guard, mobil `imageHeadersFor` karşılığı).
- **DM gate fail-open** (canDm hata/misafir→true); mevcut oda `hasDirectRoomWith` ile korunur.
- Presence/typing/grup ERTELENDİ (fail-loud yorum). Yalnız `type='direct'`.
- Test runner yok → her task sonu `npm run build` temiz. Realtime/schema/resim runtime test kimliği gerektirir (fail-loud). Bayat LSP (2307/2724/6385/71007) false-alarm. Commit: açık `git add <paths>`.

**Mobil kaynak:** `IdeaProjects/patify/lib/features/chats/{CLAUDE.md, services/chat_repository.dart, models/chat_room_model.dart, models/chat_message_model.dart, services/dm_permission_repo.dart, views/*}`.
**Web şablonları:** `lib/supabase/client.ts` (browser), `components/notifications/notifications-provider.tsx` (realtime channel/merge kalıbı), `lib/profile/public.ts` (getPublicProfile), `components/user/user-avatar.tsx`, `lib/storage/listing-images.ts` (upload kalıbı).

---

### Task 1: Types + row mapping

**Files:** Create `lib/chats/types.ts`

**Interfaces (Produces):** `ChatMessageStatus`, `ChatMessage` (discriminated union type text|image), `ChatRoom`, `mapRowToMessage(row)`, `mapRowToRoom(row)`, `otherUserId(room, uid)`, `messagePreview(m)`.

- [ ] **Step 1:** `types.ts` — spec §4 tipleri. `ChatMessage` discriminated union (`type:'text'|'image'` + ortak alanlar). `mapRowToMessage`: id/roomId→String(row.id), createdAt/updatedAt num→number (updatedAt??createdAt), status 'seen'/'sending'/else→'sent', type==='image'→image variant (uri??'' , width/height/size num|null, name string|null) else text (text??''). Bozuk satır throw ETMEZ. `mapRowToRoom`: id→string, userIds→string[], type??'direct', createdAt/updatedAt num, `lastMessages` dizi[0]→mapRowToMessage else null. `otherUserId`/`messagePreview` (image→null).
- [ ] **Step 2:** `npm run build` temiz.
- [ ] **Step 3:** Commit `git add lib/chats/types.ts && git commit -m "feat(chats): types + row mapping (bigint→string, epoch-ms)"`

---

### Task 2: Client repository (data ops)

**Files:** Create `lib/chats/repository.ts`

**Interfaces (Consumes):** Task 1. **(Produces):** `ChatRepository` (or `createChatRepository(currentUserId)`) with `fetchRooms`, `fetchUnreadCounts`, `fetchMessages`, `findOrCreateDirectRoom`, `hasDirectRoomWith`, `sendText`, `sendImage`, `markSeen`, `deleteRoom`, `uploadRoomImage`, `signedUrlForMessage`, static `sortedPair`.

- [ ] **Step 1:** `repository.ts` — browser `createClient()`; `schema='chats'`, `bucket='chats_assets'`. Mobil `chat_repository.dart` 1:1 (spec §5): fetchRooms (`.schema('chats').from('rooms').select().contains('userIds',[uid]).order('updatedAt',{ascending:false})`→mapRowToRoom); fetchUnreadCounts (`.schema('chats').rpc('unread_counts_for_current_user')`→Record<string,number>, roomId.toString()); fetchMessages (`.from('messages').select().eq('roomId',roomId).order('createdAt',{ascending:true})`→mapRowToMessage[]); findOrCreateDirectRoom (self-DM throw; sortedPair; SELECT type=direct+userIds; INSERT `{createdAt,updatedAt,type:'direct',userIds,imageUrl:null,name:null,userRoles:null}`.select(); 23505→re-select); hasDirectRoomWith (SELECT id); sendText (INSERT `{roomId,authorId,type:'text',text,createdAt,updatedAt}` — status/lastMessages YOK); sendImage (INSERT image cols); markSeen (UPDATE status:'seen',updatedAt); deleteRoom (DELETE id); uploadRoomImage (chats_assets, path `${roomId}/${crypto.randomUUID()}-${name}`, dönüş `${storage.url}/object/authenticated/${bucket}/${path}`); signedUrlForMessage(uri) (trusted host+chats_assets ise path çıkar→`.storage.from('chats_assets').createSignedUrl(path, 3600)`; değilse null).
- [ ] **Step 2:** `npm run build` temiz (2307/6385 = bayat LSP; tsc/build otoritatif).
- [ ] **Step 3:** Commit `git add lib/chats/repository.ts && git commit -m "feat(chats): client repository (rooms/messages/upload, schema chats)"`

---

### Task 3: Realtime + DM gate + start-chat

**Files:** Create `lib/chats/realtime.ts`, `lib/chats/dm.ts`

**Interfaces (Consumes):** Task 1, Task 2. **(Produces):** `subscribeRooms(onChange)`, `subscribeMessages(roomId, onInsert, onUpdate)`, `canDm(target)`, `startDirectChat(target)` → `{roomId}` | `{blocked:true}`.

- [ ] **Step 1:** `realtime.ts` (browser client): `subscribeRooms(onChange)` — `channel('chats:rooms:'+uid).on('postgres_changes',{event:'*',schema:'chats',table:'rooms'}, ()=>onChange()).subscribe()` (veri taşımaz→caller re-fetch); dönüş channel + bir `unsubscribe`/removeChannel helper. `subscribeMessages(roomId, handlers)` — `channel('chats:messages:'+roomId).on('postgres_changes',{event:'*',schema:'chats',table:'messages',filter:'roomId=eq.'+roomId}, payload=>{INSERT→onInsert(mapRowToMessage(payload.new)); UPDATE→onUpdate(mapRowToMessage(payload.new))}).subscribe()`. Notifications-provider merge kalıbı. Cleanup helper döndür.
- [ ] **Step 2:** `dm.ts`: `canDm(target)` — `.rpc('can_dm',{target})`→bool, **fail-open** (hata/misafir→true). `startDirectChat(repo, target)`: canDm (hata→true); false ise hasDirectRoomWith (hata→false) — mevcut oda yoksa `{blocked:true}`; sonra `findOrCreateDirectRoom(target)`→`{roomId: room.id}`. (Mobil `_onDmPressed` paritesi.)
- [ ] **Step 3:** `npm run build` temiz.
- [ ] **Step 4:** Commit `git add lib/chats/realtime.ts lib/chats/dm.ts && git commit -m "feat(chats): realtime subscriptions + DM gate + start-chat flow"`

---

### Task 4: Inbox page

**Files:** Modify `app/(app)/chats/page.tsx` (stub→gerçek); Create `components/chats/chat-inbox.tsx`, `components/chats/room-row.tsx`

**Interfaces (Consumes):** Task 1, 2, 3, `lib/profile/public.ts`, `components/user/user-avatar.tsx`.

- [ ] **Step 1:** `chat-inbox.tsx` (client): mount'ta `fetchRooms()` + `fetchUnreadCounts()`; `subscribeRooms(()=>re-fetch)` (cleanup unmount'ta). Karşı kullanıcı profillerini batch çek (`otherUserId`→`getPublicProfile`; N oda için Promise.all, ya da batch helper). Her oda `RoomRow`. Boş durum ("Henüz sohbet yok"). currentUserId prop (server layout'tan veya page getUser).
- [ ] **Step 2:** `room-row.tsx` (client): avatar+ad (profil), `messagePreview(room.lastMessage)` (null→"📷 Fotoğraf"), göreli zaman (updatedAt), unread rozeti (count>0), `/chats/{id}` link, sil butonu (onay→`deleteRoom`→re-fetch).
- [ ] **Step 3:** `page.tsx` (server): getUser→currentUserId; `<ChatInbox currentUserId=... />`. (Stub içeriğini kaldır.)
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add "app/(app)/chats/page.tsx" components/chats/chat-inbox.tsx components/chats/room-row.tsx && git commit -m "feat(chats): inbox (room list + realtime refresh + unread)"`

---

### Task 5: Chat room page (text)

**Files:** Create `app/(app)/chats/[roomId]/page.tsx`, `components/chats/chat-room.tsx`, `components/chats/message-bubble.tsx`, `components/chats/chat-composer.tsx`

**Interfaces (Consumes):** Task 1, 2, 3, `lib/profile/public.ts`.

- [ ] **Step 1:** `message-bubble.tsx` (client): `{ m: ChatMessage, isMine: boolean }` — metin balonu (kendi sağ/vurgulu, karşı sol); status (kendi mesajında sent/seen); göreli zaman. (Resim variant Task 6'da eklenir — şimdilik text render, image için placeholder/boş.)
- [ ] **Step 2:** `chat-composer.tsx` (client): metin input + gönder butonu → `onSend(text)` (boş engelle). (Resim ekleme Task 6.)
- [ ] **Step 3:** `chat-room.tsx` (client): `{ roomId, currentUserId }`. Mount'ta `fetchMessages(roomId)` + `subscribeMessages(roomId, onInsert/onUpdate)` (functional setState id-keyed merge; cleanup unmount). Karşı kullanıcı başlığı (room fetch veya messages'tan authorId≠uid → profil). Liste artan, en yeni altta, oto-scroll. sendText optimistic (geçici id → realtime echo id-keyed merge ile uzlaşır). Görünen karşı-taraf mesajlarını `markSeen`.
- [ ] **Step 4:** `page.tsx` (server): getUser→currentUserId (yoksa layout zaten redirect); `<ChatRoom roomId={params.roomId} currentUserId=... />`.
- [ ] **Step 5:** `npm run build` temiz.
- [ ] **Step 6:** Commit `git add "app/(app)/chats/[roomId]/page.tsx" components/chats/chat-room.tsx components/chats/message-bubble.tsx components/chats/chat-composer.tsx && git commit -m "feat(chats): room page (message list realtime + text + markSeen)"`

---

### Task 6: Image messages

**Files:** Modify `components/chats/chat-composer.tsx`, `components/chats/message-bubble.tsx`, `components/chats/chat-room.tsx`

**Interfaces (Consumes):** Task 2 (`uploadRoomImage`, `sendImage`, `signedUrlForMessage`).

- [ ] **Step 1:** `chat-composer.tsx`: resim ekle butonu (`<input type=file accept=image/*>`) → seçilen dosya `onSendImage(file)`.
- [ ] **Step 2:** `chat-room.tsx`: `onSendImage(file)` → `uploadRoomImage(roomId, file)` (dönen uri) → `sendImage(roomId, {uri, name, size, width?, height?})`. Yükleme sırasında pending göstergesi (optimistic geçici bubble opsiyonel).
- [ ] **Step 3:** `message-bubble.tsx`: `m.type==='image'` → `signedUrlForMessage(m.uri)` (async — bubble state veya bir küçük `useEffect`/server-signed) ile `<img>`; null→"görsel yüklenemedi" placeholder. Trusted-host guard'a güven (untrusted→null→render yok).
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit `git add components/chats/chat-composer.tsx components/chats/message-bubble.tsx components/chats/chat-room.tsx && git commit -m "feat(chats): image messages (upload + signed-url display)"`

---

### Task 7: Wire DM CTAs

**Files:** Create `components/chats/message-user-button.tsx`; Modify `components/emergency/emergency-actions.tsx`, adoptions detay, lost-found detay (app + public), `components/user/user-profile-actions.tsx` (veya profil user sayfası)

**Interfaces (Consumes):** Task 3 (`startDirectChat`).

- [ ] **Step 1:** `message-user-button.tsx` (client): `{ targetUserId, currentUserId, label? }`. Tıkla→`startDirectChat` akışı: `{blocked:true}`→bildirim "Bu kullanıcı yeni mesajlara kapalı"; `{roomId}`→`router.push('/chats/'+roomId)`. targetUserId===currentUserId ise render etme.
- [ ] **Step 2:** **Emergency** (`emergency-actions.tsx`): `// DEFERRED: DM CTA` yorumunu kaldır; mevcut `canDm`/dmTargetId (reporter↔claimer) mantığına göre `<MessageUserButton targetUserId={dmTargetId} .../>` — yalnız `claimedBy!=null && dmTargetId` iken (spec §7 emergency gating).
- [ ] **Step 3:** **Adoptions detay** + **Lost&found detay (app + public)**: ilan sahibine `<MessageUserButton targetUserId={ownerId} .../>` (owner değilse, currentUserId varsa; public LF'de owner_id RPC'de yoksa owner-gizleme atlanabilir — non-owner varsayımı, Task 3 startDirectChat zaten self'i target edemez). **Profil** (`user-profile-actions.tsx` / `profile/user/[id]`): "Mesaj" butonu (kendisi değilse).
- [ ] **Step 4:** `npm run build` temiz.
- [ ] **Step 5:** Commit (açık path listesi) `... && git commit -m "feat(chats): wire DM CTAs (emergency/adoptions/lost-found/profile)"`

---

## Self-Review

- **Spec coverage:** §4 types→T1, §5 repo→T2, §6 realtime/dm→T3, §7 inbox→T4/room→T5/image→T6, §8 CTA→T7. §11 kriterleri T1-T7'e dağıldı. ✅
- **Placeholder yok:** schema access, RPC adları, merge, image signed-url, DM flow explicit. ✅
- **Tip tutarlılığı:** ChatRoom/ChatMessage T1'de; repo/realtime/UI aynı tipleri kullanır; mapRowToMessage hem fetch hem realtime hem lastMessages için. ✅
- **Güvenlik:** RLS sınır; trigger alanları yazılmaz; resim trusted-host guard; DM fail-open + hasDirectRoom istisnası; authorId oturumdan. ✅
- **Crux (T2/T3):** `.schema('chats')` erişimi + realtime + image signed-url + 23505 race + fail-open DM. Zorlanırsa daha güçlü modele yükselt. Presence bilinçli ertelendi.
