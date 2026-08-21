import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { REPORT_TYPE_LABELS, type ReportType } from '@/lib/reports/types';
import type { ReportEntity, ReportQueueItem } from '@/lib/admin/moderation';

const ENTITY_LABELS: Record<ReportEntity, string> = {
  posts: 'Gönderi',
  post_comments: 'Gönderi yorumu',
  discussion: 'Tartışma',
  discussion_answers: 'Tartışma cevabı',
  discussion_answer_comments: 'Tartışma cevap yorumu',
  adoptions: 'Sahiplendirme ilanı',
  adoption_comments: 'Sahiplendirme yorumu',
  lost_found: 'Kayıp/Bulundu ilanı',
  lost_found_sightings: 'Görülme bildirimi',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ReportRow({ item }: { item: ReportQueueItem }) {
  const typeEntries = Object.entries(item.types) as [ReportType, number][];
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{ENTITY_LABELS[item.entity]}</div>
        <div className="max-w-xs truncate text-sm text-muted-foreground">
          {item.contentExists ? (item.contentPreview || '—') : 'İçerik silinmiş veya pasif'}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.ownerUsername ? `@${item.ownerUsername}` : (item.ownerId ?? 'Bilinmiyor')}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div>{item.reportCount} rapor</div>
        <div className="text-sm text-muted-foreground">{item.distinctReporters} tekil kişi</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {typeEntries.map(([type, count]) => (
            <Badge key={type} variant="secondary">
              {(REPORT_TYPE_LABELS[type] ?? type)} × {count}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.ownerRecentBlockers > 0 ? (
          <Badge variant="destructive">{item.ownerRecentBlockers} kişi son 30 günde blokladı</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        <div>İlk: {formatDateTime(item.firstAt)}</div>
        <div>Son: {formatDateTime(item.lastAt)}</div>
      </TableCell>
    </TableRow>
  );
}
