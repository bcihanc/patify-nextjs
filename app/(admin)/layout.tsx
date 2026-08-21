import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/admin/auth'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin() // anon → login, non-admin → 404
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
