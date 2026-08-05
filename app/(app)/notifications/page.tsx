import { NotificationList } from '@/components/notifications/notification-list';

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-4 px-2 text-xl font-bold">Bildirimler</h1>
      <NotificationList />
    </div>
  );
}
