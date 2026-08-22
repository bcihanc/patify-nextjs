import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listUsers } from '@/lib/admin/users';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "X gün/ay önce" 1 yıla kadar; sonrasında mutlak tarih (uzun süreler için göreli
// ifade okunabilirliği düşürür — bkz. brief: "X ay önce" or date).
function accountAge(createdAtIso: string): string {
  const days = Math.floor((Date.now() - new Date(createdAtIso).getTime()) / DAY_MS);
  if (days < 30) return `${days} gün önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return new Date(createdAtIso).toLocaleDateString('tr-TR', { dateStyle: 'medium' });
}

export default async function AdminUsersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const params = await props.searchParams;
  const q = params.q?.trim() ?? '';
  const items = await listUsers(q || undefined);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Kullanıcılar</h1>

      <form action="/admin/users" className="flex max-w-sm gap-2">
        <Input name="q" defaultValue={q} placeholder="Kullanıcı adına göre ara..." />
        <Button type="submit" variant="outline">Ara</Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{q ? 'Sonuç yok.' : 'Kullanıcı yok.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Hesap yaşı</TableHead>
                <TableHead>Son görülme</TableHead>
                <TableHead>İçerik</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                      @{u.username}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {accountAge(u.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {u.lastSeen ? formatDateTime(u.lastSeen) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{u.lfCount + u.adoptionCount + u.postCount}</div>
                    <div className="text-xs text-muted-foreground">
                      LF {u.lfCount} · Sahiplendirme {u.adoptionCount} · Gönderi {u.postCount}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {u.blocksAgainst > 0 ? (
                      <Badge variant="destructive">{u.blocksAgainst} blok</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {u.isTrusted && <Badge variant="secondary">Güvenilir</Badge>}
                      {u.isBanned && <Badge variant="destructive">Banlı</Badge>}
                      {!u.isTrusted && !u.isBanned && <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
