'use client';

import { Button } from '@/components/ui/button';
import { useNotifications } from './notifications-provider';
import { NotificationTile } from './notification-tile';

export function NotificationList() {
  const { notifications, unreadCount, markAllRead, removeAll } = useNotifications();

  function handleRemoveAll() {
    if (window.confirm('Tüm bildirimler silinsin mi?')) {
      void removeAll();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 px-2">
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => void markAllRead()}
        >
          Tümünü okundu işaretle
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={notifications.length === 0}
          onClick={handleRemoveAll}
        >
          Tümünü sil
        </Button>
      </div>

      {notifications.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          Henüz bildirim yok
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {notifications.map((n) => (
            <NotificationTile key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  );
}
