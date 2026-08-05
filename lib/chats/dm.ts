// lib/chats/dm.ts
// DM permission gate + start-chat flow. Mirrors mobile's
// dm_permission_repo.dart (canDm) and emergency_detail_page.dart's
// _onDmPressed (the fail-open gate + hasDirectRoomWith exception).
//
// The rule itself lives server-side in `public.can_dm(target uuid)` — this
// layer only reads the answer, never re-implements it (mobile
// lib/features/chats/CLAUDE.md: "İstemcide yeniden uygulama"). `can_dm`'s
// EXECUTE grant is `authenticated`-only (revoked from anon/public), so a
// guest caller already surfaces as an RPC error here — no separate
// guest-session check is needed on top of the fail-open below.

import { createClient } from '@/lib/supabase/client'
import type { ChatRepository } from '@/lib/chats/repository'

// Whether the current user may open a NEW direct room with targetUserId.
// FAIL-OPEN: any RPC error (including a guest with no EXECUTE grant)
// resolves to true — a read failure must never silently make a user
// unreachable, matching the server's own coalesce and mobile's
// dm_permission_repo.dart.
export async function canDm(targetUserId: string): Promise<boolean> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.rpc('can_dm', { target: targetUserId })
    if (error) return true
    return data === true
  } catch {
    return true
  }
}

export type StartDirectChatResult = { roomId: string } | { blocked: true }

// Mirrors mobile's _onDmPressed gate: canDm (already fail-open) decides
// whether a NEW room may be created. If it says no, an already-existing
// room is still let through — an existing conversation survives the other
// side turning DMs off. hasDirectRoomWith fails to `false` on error so a
// read failure can't be used to sneak past a genuine block.
export async function startDirectChat(
  repo: ChatRepository,
  targetUserId: string
): Promise<StartDirectChatResult> {
  const allowed = await canDm(targetUserId)
  if (!allowed) {
    let hasExisting: boolean
    try {
      hasExisting = await repo.hasDirectRoomWith(targetUserId)
    } catch {
      hasExisting = false
    }
    if (!hasExisting) {
      return { blocked: true }
    }
  }

  const room = await repo.findOrCreateDirectRoom(targetUserId)
  return { roomId: room.id }
}
