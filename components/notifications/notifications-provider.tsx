'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { AppNotification, NotificationRow, mapRowToNotification } from '@/lib/notifications/types';
import {
  deleteAllNotificationsAction,
  deleteNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationsReadAction,
} from '@/lib/notifications/actions';

// Mirrors mobile's watchInbox retention (notifications_repo.dart: order id desc, limit 200).
const MAX_NOTIFICATIONS = 200;
// Bounded retry, not an exponential-backoff engine — see task-3 brief.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (ids: number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (ids: number[]) => Promise<void>;
  removeAll: () => Promise<void>;
};

// Safe default so useNotifications() never throws when called outside a
// provider (SSR / early render).
const defaultContextValue: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
  remove: async () => {},
  removeAll: async () => {},
};

const NotificationsContext = createContext<NotificationsContextValue>(defaultContextValue);

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

function upsertById(list: AppNotification[], n: AppNotification): AppNotification[] {
  const withoutExisting = list.filter((item) => item.id !== n.id);
  return [n, ...withoutExisting].slice(0, MAX_NOTIFICATIONS);
}

function replaceIfPresent(list: AppNotification[], n: AppNotification): AppNotification[] {
  if (!list.some((item) => item.id === n.id)) return list;
  return list.map((item) => (item.id === n.id ? n : item));
}

export function NotificationsProvider({
  initial,
  userId,
  children,
}: {
  initial: AppNotification[];
  userId: string;
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initial);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    retryCountRef.current = 0;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const subscribe = () => {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const n = mapRowToNotification(payload.new as NotificationRow);
              setNotifications((prev) => upsertById(prev, n));
            } else if (payload.eventType === 'UPDATE') {
              const n = mapRowToNotification(payload.new as NotificationRow);
              setNotifications((prev) => replaceIfPresent(prev, n));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id: number }).id;
              setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (
            (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
            retryCountRef.current < MAX_RETRIES
          ) {
            retryCountRef.current += 1;
            if (channel) supabase.removeChannel(channel);
            retryTimeout = setTimeout(subscribe, RETRY_DELAY_MS);
          }
        });
    };

    subscribe();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (ids: number[]) => {
    const idSet = new Set(ids);
    setNotifications((prev) =>
      prev.map((n) => (idSet.has(n.id) ? { ...n, isRead: true } : n))
    );
    await markNotificationsReadAction(ids);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadAction();
  }, []);

  const remove = useCallback(async (ids: number[]) => {
    const idSet = new Set(ids);
    setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
    await deleteNotificationsAction(ids);
  }, []);

  const removeAll = useCallback(async () => {
    setNotifications([]);
    await deleteAllNotificationsAction();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, markRead, markAllRead, remove, removeAll }),
    [notifications, unreadCount, markRead, markAllRead, remove, removeAll]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}
