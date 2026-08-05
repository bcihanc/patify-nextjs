// lib/chats/repository.ts
// Client-side repository that talks directly to the `chats` Postgres schema
// (rooms/messages) via the browser Supabase client. Mirrors mobile's
// chat_repository.dart 1:1 — same query shapes, insert column sets, 23505
// race handling, self-DM guard, uploadRoomImage path/return shape. Security
// lives in the schema's RLS; message `status` + `rooms.lastMessages` are
// maintained by DB triggers, so this layer never sets them on write.

import { createClient } from '@/lib/supabase/client'
import { mapRowToMessage, mapRowToRoom, type ChatMessage, type ChatRoom } from '@/lib/chats/types'

// Storage base URL. This mirrors what supabase-js computes internally as
// `client.storage.url` (`${supabaseUrl}/storage/v1`) — that field is
// TS-`protected` on StorageBucketApi (verified: `c.storage.url` fails to
// compile with TS2445), so it isn't reachable from outside the SDK. Built
// from the env var instead, the same way lib/lost-found.ts already builds
// the `assets` bucket's public URL.
const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`

export type SendImageInput = {
  uri: string
  width?: number | null
  height?: number | null
  name?: string | null
  size?: number | null
}

export class ChatRepository {
  static readonly SCHEMA = 'chats' as const
  static readonly BUCKET = 'chats_assets' as const

  readonly currentUserId: string
  private readonly client: ReturnType<typeof createClient>

  constructor(currentUserId: string) {
    this.currentUserId = currentUserId
    this.client = createClient()
  }

  static sortedPair(a: string, b: string): string[] {
    return [a, b].sort()
  }

  private rooms() {
    return this.client.schema(ChatRepository.SCHEMA).from('rooms')
  }

  private messages() {
    return this.client.schema(ChatRepository.SCHEMA).from('messages')
  }

  async fetchRooms(): Promise<ChatRoom[]> {
    const { data, error } = await this.rooms()
      .select()
      .contains('userIds', [this.currentUserId])
      .order('updatedAt', { ascending: false })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(mapRowToRoom)
  }

  // Reads the same `status` receipts markSeen writes, via a SECURITY
  // INVOKER RPC — no separate read-state to drift from the receipts. Rooms
  // with nothing unread are absent from the map rather than present as zero.
  async fetchUnreadCounts(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .schema(ChatRepository.SCHEMA)
      .rpc('unread_counts_for_current_user')
    if (error) throw error

    const rows = (data ?? []) as Record<string, unknown>[]
    const result: Record<string, number> = {}
    for (const row of rows) {
      result[String(row.roomId)] = Number(row.unread_count) || 0
    }
    return result
  }

  async fetchMessages(roomId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.messages()
      .select()
      .eq('roomId', roomId)
      .order('createdAt', { ascending: true })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(mapRowToMessage)
  }

  private async selectDirectRoom(userIds: string[]): Promise<ChatRoom | null> {
    const { data, error } = await this.rooms()
      .select()
      .eq('type', 'direct')
      .eq('userIds', userIds)
      .limit(1)
    if (error) throw error

    const rows = (data ?? []) as Record<string, unknown>[]
    return rows.length > 0 ? mapRowToRoom(rows[0]!) : null
  }

  // Opens the existing direct room with `otherUserId` or creates one.
  // Rejects self-DM *before* any network call (pure, pre-network guard).
  // Handles the concurrent-create race: a duplicate insert hits the DB's
  // partial unique index (23505) → re-select the winner instead of
  // surfacing the race as an error to the caller.
  async findOrCreateDirectRoom(otherUserId: string): Promise<ChatRoom> {
    if (otherUserId === this.currentUserId) {
      throw new Error('self-DM')
    }

    const userIds = ChatRepository.sortedPair(this.currentUserId, otherUserId)
    const existing = await this.selectDirectRoom(userIds)
    if (existing) return existing

    const now = Date.now()
    const { data, error } = await this.rooms()
      .insert({
        createdAt: now,
        updatedAt: now,
        type: 'direct',
        userIds,
        imageUrl: null,
        name: null,
        userRoles: null,
      })
      .select()

    if (error) {
      if (error.code === '23505') {
        const winner = await this.selectDirectRoom(userIds)
        if (winner) return winner
      }
      throw error
    }

    const row = ((data ?? []) as Record<string, unknown>[])[0]
    if (!row) throw new Error('findOrCreateDirectRoom: insert returned no row')
    return mapRowToRoom(row)
  }

  // Whether a direct room with `otherUserId` already exists — read-only,
  // never creates. Uses the exact same `type='direct'` + sorted-pair
  // predicate findOrCreateDirectRoom uses, so the two definitions of
  // "existing room" cannot drift.
  async hasDirectRoomWith(otherUserId: string): Promise<boolean> {
    const userIds = ChatRepository.sortedPair(this.currentUserId, otherUserId)
    const { data, error } = await this.rooms()
      .select('id')
      .eq('type', 'direct')
      .eq('userIds', userIds)
      .limit(1)
    if (error) throw error
    return ((data ?? []) as unknown[]).length > 0
  }

  async sendText(roomId: string, text: string): Promise<void> {
    const now = Date.now()
    const { error } = await this.messages().insert({
      roomId,
      authorId: this.currentUserId,
      type: 'text',
      text,
      createdAt: now,
      updatedAt: now,
    })
    if (error) throw error
  }

  async sendImage(roomId: string, image: SendImageInput): Promise<void> {
    const now = Date.now()
    const { error } = await this.messages().insert({
      roomId,
      authorId: this.currentUserId,
      type: 'image',
      uri: image.uri,
      width: image.width ?? null,
      height: image.height ?? null,
      name: image.name ?? null,
      size: image.size ?? null,
      createdAt: now,
      updatedAt: now,
    })
    if (error) throw error
  }

  async markSeen(roomId: string, messageId: string): Promise<void> {
    const { error } = await this.messages()
      .update({ status: 'seen', updatedAt: Date.now() })
      .eq('roomId', roomId)
      .eq('id', messageId)
    if (error) throw error
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await this.rooms().delete().eq('id', roomId)
    if (error) throw error
  }

  async uploadRoomImage(roomId: string, file: File): Promise<string> {
    const path = `${roomId}/${crypto.randomUUID()}-${file.name}`
    const { error } = await this.client.storage
      .from(ChatRepository.BUCKET)
      .upload(path, file, { contentType: file.type })
    if (error) throw error
    return `${STORAGE_URL}/object/authenticated/${ChatRepository.BUCKET}/${path}`
  }

  // Web equivalent of mobile's `imageHeadersFor` token-exfil guard. A
  // `chats.messages` row's `uri` is attacker-controllable (any room member
  // can insert an image message with an arbitrary `uri` via the
  // RLS-permitted insert). A signed URL embeds a scoped, time-limited
  // access token, so we only ever mint one for a uri that actually targets
  // our own trusted storage bucket — never for a foreign/untrusted host.
  async signedUrlForMessage(uri: string): Promise<string | null> {
    try {
      const base = new URL(STORAGE_URL)
      const trustedHost = base.host.toLowerCase()
      const target = new URL(uri)
      // Exact scheme + host — no substring/lookalike bypass.
      if (target.protocol !== 'https:' || target.host.toLowerCase() !== trustedHost) {
        return null
      }

      // EXACT path prefix. An `indexOf(marker)` substring match would let a
      // crafted path smuggle `/chats_assets/` mid-string; the object MUST live
      // directly under our bucket's authenticated path, so require startsWith
      // on the full prefix.
      const prefix = `${base.pathname.replace(/\/$/, '')}/object/authenticated/${ChatRepository.BUCKET}/`
      if (!target.pathname.startsWith(prefix)) return null

      const rawPath = target.pathname.slice(prefix.length)
      if (!rawPath) return null

      // Decode ONCE, then reject anything that could traverse. A double-encoded
      // segment (`%252e%252e`) survives the URL parse above and, if left
      // unsanitized, fetch() re-normalizes it into a real `../` that escapes the
      // bucket — the victim's browser would then fire an authenticated request
      // to an attacker-chosen path. Residual `%` after one decode == it was
      // double-encoded → reject. Also reject `.`/`..`/empty segments + backslash.
      let path: string
      try {
        path = decodeURIComponent(rawPath)
      } catch {
        return null
      }
      if (path.includes('%') || path.includes('\\')) return null
      if (path.split('/').some((s) => s === '' || s === '.' || s === '..')) return null

      const { data, error } = await this.client.storage
        .from(ChatRepository.BUCKET)
        .createSignedUrl(path, 3600)
      if (error || !data) return null
      return data.signedUrl
    } catch {
      return null
    }
  }
}

export function createChatRepository(currentUserId: string): ChatRepository {
  return new ChatRepository(currentUserId)
}
