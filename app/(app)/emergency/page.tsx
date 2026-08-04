import { browseEmergency } from '@/lib/emergency/read';
import { EMPTY_EMERGENCY_FILTERS } from '@/lib/emergency/types';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { EmergencyBrowseList } from './browse-list';

// Server can't read localStorage, so SSR always renders the unfiltered first
// page; the client hydrates any persisted filter snapshot on mount (Task 5).
export default async function EmergencyPage() {
  const [firstPage, me] = await Promise.all([
    browseEmergency(EMPTY_EMERGENCY_FILTERS, 0),
    getCurrentUserProfile(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Acil Durumlar</h1>
      <EmergencyBrowseList initial={firstPage} ownerId={me?.id ?? null} />
    </div>
  );
}
