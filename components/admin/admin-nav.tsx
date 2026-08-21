'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: 'Genel Bakış', icon: '📊' },
  { href: '/admin/moderation', label: 'Moderasyon', icon: '🛡️' },
  { href: '/admin/feedback', label: 'Feedback', icon: '💬' },
  { href: '/admin/metrics', label: 'Metrikler', icon: '📈' },
  { href: '/admin/users', label: 'Kullanıcılar', icon: '👤' },
  { href: '/admin/content', label: 'İçerik', icon: '🐾' },
  { href: '/admin/ops', label: 'Ops / Flag’ler', icon: '⚙️' },
  { href: '/admin/push', label: 'Push', icon: '🔔' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  return (
    <aside className="w-52 shrink-0 border-r p-3 text-sm">
      <div className="mb-3 px-2 font-semibold opacity-60">PATIFY ADMIN</div>
      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((it) => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-md px-2 py-1.5 ${active ? 'bg-primary/15 font-medium' : 'hover:bg-muted'}`}
            >
              <span className="mr-2">{it.icon}</span>{it.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
