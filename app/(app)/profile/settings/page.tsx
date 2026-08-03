import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Download, Lock, Palette, Trash2, User, UserX, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { cn } from '@/lib/utils';
import { AnalyticsConsentToggle } from './analytics-consent-toggle';

// Settings hub (spec §4.5) — ONLY the self-contained items. Bookmarks, my
// applications, accept-DMs and notification settings are deferred to later
// domains and deliberately omitted, not stubbed (brief: don't render dead
// entries).
export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Ayarlar</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Hesap</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <SettingsRow href="/profile/edit" icon={User} label="Profili düzenle" />
            <SettingsRow href="/profile/change-password" icon={Lock} label="Şifre değiştir" />
            <SettingsRow href="/profile/blocked" icon={UserX} label="Engellenen kullanıcılar" />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Tercihler</h2>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <AnalyticsConsentToggle initialEnabled={profile.analyticsConsentAt !== null} />
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Tema
              </div>
              <ThemeSwitcher />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Veri</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <SettingsRow href="/profile/delete" icon={Download} label="Verilerimi dışa aktar" />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-destructive">Tehlikeli alan</h2>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <SettingsRow href="/profile/delete" icon={Trash2} label="Hesabı sil" destructive />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SettingsRow({
  href,
  icon: Icon,
  label,
  destructive = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent',
        destructive && 'text-destructive',
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
