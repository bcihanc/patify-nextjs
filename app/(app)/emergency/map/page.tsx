import Link from 'next/link';
import { redirect } from 'next/navigation';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasMapsKey } from '@/lib/maps/google-maps';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { EmergencyMapView } from '../map-view';

export default async function EmergencyMapPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  // Key yoksa harita hiç yüklenmez — graceful-degrade kartı + listeye dönüş.
  if (!hasMapsKey()) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Harita için yapılandırma gerekli</CardTitle>
            <CardDescription>
              Yönetici Google Maps anahtarını ekleyene kadar liste görünümünü kullanabilirsin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/emergency">Listeye dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Harita</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/emergency">
            <List className="mr-1.5 h-4 w-4" />
            Liste
          </Link>
        </Button>
      </div>
      <EmergencyMapView />
    </div>
  );
}
