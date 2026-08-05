import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, FileText, Mail, Shield, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { AboutActions } from './about-actions';

// Mobil about_page.dart paritesi: Header -> Uygulama -> Kurallar -> Yasal -> Footer.
export default async function AboutPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold">Patify</h1>
          {/* package.json'da version alanı yok; gerçek olmayan bir semver
              uydurmak yerine sabit bir etiket gösteriyoruz. */}
          <span className="text-sm text-muted-foreground">Web</span>
        </div>
        <p className="text-sm text-muted-foreground">Evcil hayvan dünyasına dair her şey.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Uygulama</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <AboutActions />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Kurallar</h2>
        {/* POLICY-01: satış yasağı bildirimi — components/adoptions/sales-ban-banner.tsx
            ile aynı metin, ama burada kalıcı: dismiss yok. */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground">
              Patify&apos;da evcil hayvanların ücretli satışı veya takası yasaktır. İlanlar yalnızca
              ücretsiz sahiplendirme içindir.
            </p>
            <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0">
              <Link href="/tos">Detaylar</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Yasal</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <LegalRow href="/pp" icon={Shield} label="Gizlilik Politikası" />
            <LegalRow href="/tos" icon={FileText} label="Kullanım Koşulları" />
            <LegalRow href="mailto:b.cihancengiz@gmail.com" icon={Mail} label="İletişim" />
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Patify</p>
    </div>
  );
}

// settings/page.tsx'teki SettingsRow ile aynı satır dili; harici (mailto:)
// hedefler için next/link yerine düz <a> kullanır (bkz. components/hero.tsx).
function LegalRow({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  const content = (
    <>
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </>
  );
  const className = 'flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent';

  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
