import { avatarUrl } from '@/lib/storage/avatar';
import { cn } from '@/lib/utils';

export function UserAvatar({
  username,
  profilePhoto,
  size = 40,
  className,
}: {
  username: string | null;
  profilePhoto: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (username ?? '?').charAt(0).toUpperCase();
  const dimension = { width: size, height: size };

  if (profilePhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image remotePatterns bilinçli olarak yapılandırılmadı (F0 kalıbı)
      <img
        src={avatarUrl(profilePhoto)}
        alt=""
        style={dimension}
        className={cn('rounded-full border border-border bg-secondary object-cover', className)}
      />
    );
  }
  return (
    <span
      style={dimension}
      className={cn(
        'flex items-center justify-center rounded-full border border-border bg-secondary font-semibold text-secondary-foreground',
        className,
      )}
    >
      {initial}
    </span>
  );
}
