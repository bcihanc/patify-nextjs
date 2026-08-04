import { Instagram, Facebook, Twitter, Music2, Send } from 'lucide-react';
import {
  safeSocialUrl,
  INSTAGRAM_HOSTS,
  TIKTOK_HOSTS,
  FACEBOOK_HOSTS,
  X_HOSTS,
  TELEGRAM_HOSTS,
} from '@/lib/social/safe-url';
import type { PublicUserProfile } from '@/lib/profile/types';

// Her link safeSocialUrl ile doğrulanır; null dönerse ikon HİÇ render edilmez.
export function SocialLinks({ profile }: { profile: PublicUserProfile }) {
  const links = [
    { url: safeSocialUrl(profile.instagram_url, INSTAGRAM_HOSTS), Icon: Instagram, label: 'Instagram' },
    { url: safeSocialUrl(profile.tiktok_url, TIKTOK_HOSTS), Icon: Music2, label: 'TikTok' },
    { url: safeSocialUrl(profile.facebook_url, FACEBOOK_HOSTS), Icon: Facebook, label: 'Facebook' },
    { url: safeSocialUrl(profile.x_url, X_HOSTS), Icon: Twitter, label: 'X' },
    { url: safeSocialUrl(profile.telegram_url, TELEGRAM_HOSTS), Icon: Send, label: 'Telegram' },
  ].filter((l): l is { url: string; Icon: typeof Instagram; label: string } => l.url !== null);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      {links.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}
