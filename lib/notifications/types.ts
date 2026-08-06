export type NotificationRow = {
  id: number;
  category: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean | null;
  created_at: string;
  user_id: string;
};

export type AppNotification = {
  id: number;
  category: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export function mapRowToNotification(r: NotificationRow): AppNotification {
  const data = r.data && typeof r.data === 'object' && !Array.isArray(r.data)
    ? r.data
    : {};

  return {
    id: r.id,
    category: r.category,
    type: r.type,
    title: r.title,
    body: r.body,
    url: r.url,
    data,
    isRead: r.is_read ?? false,
    createdAt: r.created_at,
  };
}

// The `notifications.url` column stores mobile-app deep-link paths, shared with
// the native apps. Two of them carry an extra route segment the web app's routes
// don't have, so pushing them verbatim 404s on web:
//   /chats/chat/:id         -> web route is /chats/:id
//   /adoptions/adoption/:id  -> web route is /adoptions/:id
// The others (/lost-found/item/:id, /profile/user/:id) already match web routes.
export function toWebNotificationPath(url: string): string {
  return url
    .replace(/^\/chats\/chat\//, '/chats/')
    .replace(/^\/adoptions\/adoption\//, '/adoptions/');
}

export function notificationActorId(n: AppNotification): string | null {
  const actorId = n.data['actor_id'];
  return typeof actorId === 'string' ? actorId : null;
}

export function notificationActorUsername(n: AppNotification): string | null {
  const actorUsername = n.data['actor_username'];
  return typeof actorUsername === 'string' ? actorUsername : null;
}

export function notificationActorPhoto(n: AppNotification): string | null {
  const actorPhoto = n.data['actor_photo'];
  return typeof actorPhoto === 'string' ? actorPhoto : null;
}
