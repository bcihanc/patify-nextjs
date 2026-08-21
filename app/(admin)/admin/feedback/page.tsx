import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getFeedback } from '@/lib/admin/feedback';
import { FEEDBACK_CATEGORY_LABELS, type FeedbackCategory } from '@/lib/feedback/types';
import { FeedbackStatusSelect } from './_components/feedback-status-select';

function categoryLabel(category: string): string {
  return FEEDBACK_CATEGORY_LABELS[category as FeedbackCategory] ?? category;
}

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
                  <TableCell className="max-w-md">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">{categoryLabel(item.category)}</Badge>
                      <span>{item.message}</span>
                    </div>
                  </TableCell>
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
