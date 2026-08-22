import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ContentHealthGroup } from '@/lib/admin/metrics';

// surface adları RPC'den snake_case geliyor — burada sadece görüntü etiketi.
const SURFACE_LABELS: Record<string, string> = {
  lost_found: 'Kayıp-Bulundu',
  adoptions: 'Sahiplendirme',
  adoptions_adopted: 'Sahiplendirme (adopted)',
  emergency: 'Acil Durum',
};

export function ContentHealthTable({ group }: { group: ContentHealthGroup }) {
  const total = group.rows.reduce((sum, r) => sum + r.n, 0);
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{SURFACE_LABELS[group.surface] ?? group.surface}</TableHead>
            <TableHead className="text-right">Adet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.rows.map((r) => (
            <TableRow key={r.status}>
              <TableCell>{r.status}</TableCell>
              <TableCell className="text-right tabular-nums">{r.n}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-medium">
            <TableCell>Toplam</TableCell>
            <TableCell className="text-right tabular-nums">{total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
