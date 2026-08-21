import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getFeedback } from '@/lib/admin/feedback';
import { FeedbackStatusSelect } from './_components/feedback-status-select';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function FeedbackInboxPage() {
  const items = await getFeedback();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Geri Bildirim Kutusu</h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz geri bildirim yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mesaj</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Uygulama sürümü</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-md">{item.message}</TableCell>
                  <TableCell>
                    <FeedbackStatusSelect id={item.id} status={item.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item.appVersion ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.platform ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(item.createdAt)}
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
