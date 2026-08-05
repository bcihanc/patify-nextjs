// lib/chats/types.ts
// Chat domain types + row mapping. Mirrors the mobile app's
// chat_message_model.dart / chat_room_model.dart fromRow logic: bigint
// id/roomId columns arrive as JS numbers or strings and are coerced to
// String; timestamps are epoch-ms numbers. Mapping is defensive by design —
// a malformed row must never throw.

export type ChatMessageStatus = 'sending' | 'sent' | 'seen';

export type ChatMessage = {
  id: string;
  roomId: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  status: ChatMessageStatus;
} & (
  | { type: 'text'; text: string }
  | {
      type: 'image';
      uri: string;
      width: number | null;
      height: number | null;
      name: string | null;
      size: number | null;
    }
);

export type ChatRoom = {
  id: string;
  userIds: string[];
  type: string;
  createdAt: number;
  updatedAt: number;
  lastMessage: ChatMessage | null;
};

function statusFromRow(raw: unknown): ChatMessageStatus {
  switch (raw) {
    case 'seen':
      return 'seen';
    case 'sending':
      return 'sending';
    default:
      return 'sent';
  }
}

// Builds a message from a `chats.messages` row (or a `rooms.lastMessages[0]`
// jsonb element — same camelCase shape). Only 'text' and 'image' exist in
// prod; any other type is treated as text with an empty body.
export function mapRowToMessage(row: Record<string, unknown>): ChatMessage {
  const id = String(row.id);
  const roomId = String(row.roomId);
  const authorId = String(row.authorId);
  const createdAt = Number(row.createdAt) || 0;
  const updatedAt = row.updatedAt != null ? Number(row.updatedAt) : createdAt;
  const status = statusFromRow(row.status);

  if (row.type === 'image') {
    return {
      id,
      roomId,
      authorId,
      createdAt,
      updatedAt,
      status,
      type: 'image',
      uri: (row.uri as string) ?? '',
      width: row.width != null ? Number(row.width) : null,
      height: row.height != null ? Number(row.height) : null,
      name: (row.name as string) ?? null,
      size: row.size != null ? Number(row.size) : null,
    };
  }

  return {
    id,
    roomId,
    authorId,
    createdAt,
    updatedAt,
    status,
    type: 'text',
    text: (row.text as string) ?? '',
  };
}

// Builds a room from a `chats.rooms` row. The trigger-maintained
// `lastMessages` jsonb array holds the raw newest message (no author join);
// element [0] becomes `lastMessage`.
export function mapRowToRoom(row: Record<string, unknown>): ChatRoom {
  const id = String(row.id);
  const userIds = Array.isArray(row.userIds) ? row.userIds.map(String) : [];
  const type = (row.type as string) ?? 'direct';
  const createdAt = Number(row.createdAt) || 0;
  const updatedAt = Number(row.updatedAt) || 0;

  const rawLastMessages = row.lastMessages;
  const firstLastMessage =
    Array.isArray(rawLastMessages) && rawLastMessages.length > 0
      ? rawLastMessages[0]
      : undefined;
  const lastMessage =
    typeof firstLastMessage === 'object' && firstLastMessage !== null
      ? mapRowToMessage(firstLastMessage as Record<string, unknown>)
      : null;

  return { id, userIds, type, createdAt, updatedAt, lastMessage };
}

// The other participant in a direct room (falls back to self for a
// degenerate single-member row).
export function otherUserId(room: ChatRoom, currentUserId: string): string {
  return room.userIds.find((id) => id !== currentUserId) ?? currentUserId;
}

// One-line preview for the room list: the text, or null for images (caller
// substitutes a "📷 Fotoğraf" label).
export function messagePreview(m: ChatMessage): string | null {
  return m.type === 'text' ? m.text : null;
}
