import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getReportQueue } from '@/lib/admin/moderation';
import { ReportRow } from './_components/report-row';

export default async function ModerationQueuePage() {
  const items = await getReportQueue();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Moderasyon Kuyruğu</h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bekleyen rapor yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İçerik</TableHead>
                <TableHead>Sahip</TableHead>
                <TableHead>Rapor</TableHead>
                <TableHead>Tür dağılımı</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>İlk / Son rapor</TableHead>
                <TableHead>Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <ReportRow key={`${item.entity}:${item.entityId}`} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
