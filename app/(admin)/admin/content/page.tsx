import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listContent, type ContentSurface } from '@/lib/admin/content';
import { LF_STATUS_LABELS } from '@/lib/lost-found/types';
import { ADOPTION_STATUS_LABELS } from '@/lib/adoptions/types';
import { EMERGENCY_STATUS_LABELS } from '@/lib/emergency/types';
import { ContentFilters } from './_components/content-filters';
import { ContentRowActions } from './_components/content-row-actions';

const SURFACES: ContentSurface[] = ['lost_found', 'adoptions', 'emergency'];

// emergency'de report_entity yok → gizle/tekrar-aç RPC'si emergency'yi kapsamıyor,
// bu yüzden emergency sekmesi kasıtlı olarak salt-okunur (bkz. brief).
const STATUS_LABELS: Record<ContentSurface, Record<string, string>> = {
  lost_found: LF_STATUS_LABELS,
  adoptions: ADOPTION_STATUS_LABELS,
  emergency: EMERGENCY_STATUS_LABELS,
};

function parseSurface(v: string | undefined): ContentSurface {
  return (SURFACES as string[]).includes(v ?? '') ? (v as ContentSurface) : 'lost_found';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminContentPage(props: {
  searchParams: Promise<{ surface?: string; status?: string }>;
}) {
  const params = await props.searchParams;
  const surface = parseSurface(params.surface);
  const status = params.status?.trim() ?? '';
  const items = await listContent(surface, status || undefined);
  const labels = STATUS_LABELS[surface];
  const statusOptions = Object.entries(labels).map(([value, label]) => ({ value, label }));
  const canModerate = surface !== 'emergency';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">İçerik</h1>
      <ContentFilters surface={surface} status={status} statusOptions={statusOptions} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Kayıt yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İçerik</TableHead>
                <TableHead>Sahip</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Yaş</TableHead>
                <TableHead>Rapor</TableHead>
                {canModerate && <TableHead>Aksiyon</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-xs truncate">{item.preview || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">@{item.ownerUsername}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={item.status === 'pasif' ? 'destructive' : 'secondary'}>
                      {labels[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.reportsCount > 0 ? (
                      <Badge variant="destructive">{item.reportsCount}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canModerate && (
                    <TableCell>
                      <ContentRowActions
                        entity={surface as 'lost_found' | 'adoptions'}
                        entityId={item.id}
                        isPasif={item.status === 'pasif'}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
