import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Global 404 — hem eşleşmeyen URL'ler hem de notFound() çağrıları için.
// Kullanıcıyı çıkmazda bırakmadan ana akışa geri döndürür.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <PawPrint className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="text-muted-foreground">
        Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/lost-found">Ana sayfaya dön</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/adoptions">Sahiplendirmeler</Link>
        </Button>
      </div>
    </div>
  );
}
