import { redirect } from 'next/navigation';
import { EmergencyForm } from '@/components/emergency/emergency-form';
import { getCurrentUserProfile } from '@/lib/profile/server';

export default async function CreateEmergencyPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Acil durum bildir</h1>
      <EmergencyForm />
    </div>
  );
}
