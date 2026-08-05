'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChatRepository } from '@/lib/chats/repository';
import { subscribeMessages } from '@/lib/chats/realtime';
import { otherUserId, type ChatMessage } from '@/lib/chats/types';
import { createClient } from '@/lib/supabase/client';
import type { PublicUserSummary } from '@/lib/profile/types';
import { UserAvatar } from '@/components/user/user-avatar';
import { MessageBubble } from './message-bubble';
import { ChatComposer } from './chat-composer';

export function ChatRoom({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const repo = useMemo(() => createChatRepository(currentUserId), [currentUserId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<PublicUserSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Guards every setState below against firing after unmount (same shape
  // as chat-inbox.tsx's `cancelled` flag).
  const cancelledRef = useRef(false);
  // Message ids we've already called markSeen for — a ref (not state) so it
  // doesn't retrigger the effect and doesn't re-fire for the same id across
  // re-renders.
  const markedSeenRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(0);

  // Resolves the other participant's header via the room row rather than
  // scanning messages for an authorId !== currentUserId — that would leave
  // a generic header until the OTHER user sends a first message, which is
  // the common case right after `findOrCreateDirectRoom` (room exists,
  // nobody has said anything yet).
  const loadOtherUser = useCallback(async () => {
    const rooms = await repo.fetchRooms();
    if (cancelledRef.current) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const otherId = otherUserId(room, currentUserId);
    if (otherId === currentUserId) return; // degenerate single-member row

    const { data, error } = await createClient()
      .from('user_profiles')
      .select('id, username, profile_photo')
      .eq('id', otherId)
      .returns<PublicUserSummary[]>();
    if (cancelledRef.current) return;
    if (error) {
      console.error('ChatRoom: profil getirme başarısız:', error.message);
      return;
    }
    setOtherUser(data?.[0] ?? null);
  }, [repo, roomId, currentUserId]);

  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      const fetched = await repo.fetchMessages(roomId);
      if (cancelledRef.current) return;
      setMessages(fetched);
      setLoaded(true);
    })();

    void loadOtherUser();

    const unsubscribe = subscribeMessages(roomId, {
      onInsert: (m) => {
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;

          // Reconcile with our own optimistic temp bubble: same author,
          // same text, still 'sending'. Replacing in place (rather than
          // dropping + appending) keeps its position in the list stable.
          const tempIndex = prev.findIndex(
            (x) =>
              x.id.startsWith('temp-') &&
              x.status === 'sending' &&
              x.authorId === m.authorId &&
              x.type === 'text' &&
              m.type === 'text' &&
              x.text === m.text
          );
          if (tempIndex !== -1) {
            const next = prev.slice();
            next[tempIndex] = m;
            return next;
          }

          return [...prev, m];
        });
      },
      onUpdate: (m) => {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      },
    });

    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [roomId, repo, loadOtherUser]);

  // Auto-scroll to the newest message ONLY when the count grows (initial
  // load, realtime insert, optimistic send) — NOT on in-place status updates
  // (a markSeen echo replaces a row by id without changing the count), which
  // would otherwise yank the view to the bottom while the user scrolls up
  // reading history.
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  // markSeen for every visible OTHER-author message not yet 'seen' — "on
  // load + on new incoming other-message" per the task brief, guarded by
  // markedSeenRef so an id is only ever sent once (no spam for
  // already-seen messages, no re-fire across re-renders).
  useEffect(() => {
    for (const m of messages) {
      if (m.authorId === currentUserId) continue;
      if (m.status === 'seen') continue;
      if (markedSeenRef.current.has(m.id)) continue;

      markedSeenRef.current.add(m.id);
      void repo.markSeen(roomId, m.id).catch((e) => {
        console.error('ChatRoom: markSeen başarısız:', e);
        markedSeenRef.current.delete(m.id); // allow retry on the next pass
      });
    }
  }, [messages, currentUserId, repo, roomId]);

  const handleSend = useCallback(
    (text: string) => {
      const now = Date.now();
      const temp: ChatMessage = {
        id: `temp-${crypto.randomUUID()}`,
        roomId,
        authorId: currentUserId,
        createdAt: now,
        updatedAt: now,
        status: 'sending',
        type: 'text',
        text,
      };
      setMessages((prev) => [...prev, temp]);

      void repo.sendText(roomId, text).catch((e) => {
        console.error('ChatRoom: mesaj gönderilemedi:', e);
        // Drop the failed optimistic bubble — no realtime echo will ever
        // arrive to reconcile it.
        setMessages((prev) => prev.filter((x) => x.id !== temp.id));
      });
    },
    [repo, roomId, currentUserId]
  );

  // Best-effort upload → insert. Dimensions are read in-memory via
  // createImageBitmap when available; decode failure (unsupported format,
  // corrupt file) must not block the send — width/height simply stay
  // undefined, matching sendImage's optional fields. The realtime INSERT
  // echo brings the real message row, so there's no optimistic temp bubble
  // here — `uploadingImage` drives a lightweight pending state instead.
  const handleSendImage = useCallback(
    async (file: File) => {
      setImageError(null);
      setUploadingImage(true);
      try {
        const uri = await repo.uploadRoomImage(roomId, file);

        let width: number | undefined;
        let height: number | undefined;
        try {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          // dimensions stay undefined — non-fatal
        }

        await repo.sendImage(roomId, { uri, name: file.name, size: file.size, width, height });
      } catch (e) {
        console.error('ChatRoom: görsel gönderilemedi:', e);
        setImageError('Görsel gönderilemedi, tekrar deneyin.');
      } finally {
        setUploadingImage(false);
      }
    },
    [repo, roomId]
  );

  // Bound method handed down to MessageBubble — bubble has no repo of its
  // own (repo needs currentUserId, which lives here), so this is the one
  // seam through which the trusted-host guard reaches the bubble.
  const signImageUrl = useCallback((uri: string) => repo.signedUrlForMessage(uri), [repo]);

  const username = otherUser?.username ?? 'Kullanıcı';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-border px-2 pb-3">
        <UserAvatar username={username} profilePhoto={otherUser?.profile_photo ?? null} size={36} />
        <p className="font-medium">{username}</p>
      </div>

      <div className="flex flex-col gap-2 px-2">
        {loaded && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Henüz mesaj yok, ilk mesajı gönder
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            m={m}
            isMine={m.authorId === currentUserId}
            signImageUrl={signImageUrl}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-2 pt-2">
        {uploadingImage && (
          <p className="pb-1 text-xs text-muted-foreground">Görsel yükleniyor…</p>
        )}
        {imageError && <p className="pb-1 text-xs text-destructive">{imageError}</p>}
        <ChatComposer onSend={handleSend} onSendImage={handleSendImage} disabled={uploadingImage} />
      </div>
    </div>
  );
}
