import Link from 'next/link';

// Yasal/destek sayfalarına global erişim. Hem GuestShell (misafir) hem AppShell
// (girişli) her sayfanın altında render eder → CSAE dahil linkler herkese ve
// crawler'lara açık (Google Play CSAE zorunluluğu). Sayfaların kendisi
// app/(public)/(support-pages)/* altında.
const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: '/cr', label: 'Telif Hakkı' },
  { href: '/pp', label: 'Gizlilik' },
  { href: '/tos', label: 'Kullanım Koşulları' },
  { href: '/csae', label: 'Çocuk Güvenliği' },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} Patify</p>
    </footer>
  );
}
