'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContentSurface } from '@/lib/admin/content';

const SURFACE_TABS: { value: ContentSurface; label: string }[] = [
  { value: 'lost_found', label: 'Kayıp & Bulunan' },
  { value: 'adoptions', label: 'Sahiplendirme' },
  { value: 'emergency', label: 'Acil' },
];

// Sekme/durum değişimi URL üzerinden navigasyon — Server Component sayfa yeni
// searchParams ile yeniden veri çeker (client-side state tutmuyoruz).
export function ContentFilters({
  surface,
  status,
  statusOptions,
}: {
  surface: ContentSurface;
  status: string;
  statusOptions: { value: string; label: string }[];
}) {
  const router = useRouter();

  function navigate(next: { surface?: ContentSurface; status?: string }) {
    const nextSurface = next.surface ?? surface;
    // Durum değerleri surface'e özgü — sekme değişince durum filtresini sıfırlıyoruz.
    const nextStatus = next.surface ? '' : (next.status ?? status);
    const params = new URLSearchParams({ surface: nextSurface });
    if (nextStatus) params.set('status', nextStatus);
    router.push(`/admin/content?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={surface} onValueChange={(v) => navigate({ surface: v as ContentSurface })}>
        <TabsList>
          {SURFACE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select value={status || 'all'} onValueChange={(v) => navigate({ status: v === 'all' ? '' : v })}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tüm durumlar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm durumlar</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
