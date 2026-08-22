import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPushAudit } from '@/lib/admin/push';
import { BroadcastForm } from './_components/broadcast-form';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminPushPage() {
  const audit = await getPushAudit();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Push / Bildirim</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toplu duyuru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Yalnızca <span className="font-medium">uygulama-içi</span> bildirim üretir — telefon push&apos;u
            (OneSignal) ayrı bir yetenektir ve bu panelde yer almaz.
          </p>
          <BroadcastForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gönderim denetimi</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Denetim kaydı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gönderen</TableHead>
                    <TableHead>Alan</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.senderUsername ?? a.senderId ?? '—'}</TableCell>
                      <TableCell>{a.receiverUsername ?? a.receiverId ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
