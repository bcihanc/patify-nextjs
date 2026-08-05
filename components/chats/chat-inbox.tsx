'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChatRepository } from '@/lib/chats/repository';
import { subscribeRooms } from '@/lib/chats/realtime';
import { otherUserId, type ChatRoom } from '@/lib/chats/types';
import { createClient } from '@/lib/supabase/client';
import type { PublicUserSummary } from '@/lib/profile/types';
import { RoomRow } from './room-row';

export function ChatInbox({ currentUserId }: { currentUserId: string }) {
  const repo = useMemo(() => createChatRepository(currentUserId), [currentUserId]);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Map<string, PublicUserSummary>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Set false on mount, flipped true in the effect's cleanup — guards every
  // setState below against firing after unmount (same shape as
  // notifications-provider.tsx's `cancelled` flag).
  const cancelledRef = useRef(false);

  const reload = useCallback(async () => {
    const [fetchedRooms, fetchedUnread] = await Promise.all([
      repo.fetchRooms(),
      repo.fetchUnreadCounts(),
    ]);
    if (cancelledRef.current) return;

    setRooms(fetchedRooms);
    setUnreadCounts(fetchedUnread);
    setLoaded(true);

    // Other-user profiles in ONE batch query — never per-row.
    const otherIds = Array.from(
      new Set(fetchedRooms.map((room) => otherUserId(room, currentUserId)))
    );
    if (otherIds.length === 0) {
      setProfiles(new Map());
      return;
    }

    const { data, error } = await createClient()
      .from('user_profiles')
      .select('id, username, profile_photo')
      .in('id', otherIds)
      .returns<PublicUserSummary[]>();
    if (cancelledRef.current) return;
    if (error) {
      console.error('ChatInbox: profil toplu getirme başarısız:', error.message);
      return;
    }

    setProfiles(new Map((data ?? []).map((user) => [user.id, user])));
  }, [repo, currentUserId]);

  useEffect(() => {
    cancelledRef.current = false;
    void reload();

    const unsubscribe = subscribeRooms(currentUserId, () => void reload());

    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [currentUserId, reload]);

  const handleDelete = useCallback(
    async (roomId: string) => {
      await repo.deleteRoom(roomId);
      if (!cancelledRef.current) void reload();
    },
    [repo, reload]
  );

  if (!loaded) return null;

  if (rooms.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-sm text-muted-foreground">Henüz sohbet yok</p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {rooms.map((room) => (
        <RoomRow
          key={room.id}
          room={room}
          otherUser={profiles.get(otherUserId(room, currentUserId)) ?? null}
          unreadCount={unreadCounts[room.id] ?? 0}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
