// lib/chats/realtime.ts
// Realtime subscriptions over the `chats` schema (rooms/messages). Mirrors
// the channel + postgres_changes + subscribe + removeChannel shape proven in
// components/notifications/notifications-provider.tsx, and mobile's
// chat_repository.dart subscribeRooms/watchMessages.
//
// `schema: 'chats'` in every postgres_changes filter below is REQUIRED —
// rooms/messages live outside `public`, so an unqualified filter silently
// matches nothing (mobile lib/features/chats/CLAUDE.md: "chats.rooms,
// chats.messages, chats.users publication'da").

import { createClient } from '@/lib/supabase/client'
import { mapRowToMessage, type ChatMessage } from '@/lib/chats/types'

// Fires onChange on any INSERT/UPDATE/DELETE to chats.rooms. Carries no row
// data by design — the caller re-fetches (mobile CLAUDE.md: "oda listesi
// realtime kanalı veri taşımaz, çağıran yeniden fetch eder"). Returns an
// unsubscribe function; cleanup is the caller's responsibility.
export function subscribeRooms(currentUserId: string, onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel(`chats:rooms:${currentUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'chats', table: 'rooms' },
      () => onChange()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export type MessageHandlers = {
  onInsert: (m: ChatMessage) => void
  onUpdate: (m: ChatMessage) => void
}

// Fires onInsert/onUpdate for chats.messages rows belonging to `roomId`.
// DELETE is rare for messages and intentionally not handled here. Returns
// an unsubscribe function; cleanup is the caller's responsibility.
export function subscribeMessages(roomId: string, handlers: MessageHandlers): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel(`chats:messages:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'chats', table: 'messages', filter: `roomId=eq.${roomId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          handlers.onInsert(mapRowToMessage(payload.new as Record<string, unknown>))
        } else if (payload.eventType === 'UPDATE') {
          handlers.onUpdate(mapRowToMessage(payload.new as Record<string, unknown>))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
