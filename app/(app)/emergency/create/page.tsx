import { EmergencyForm } from '@/components/emergency/emergency-form';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function CreateEmergencyPage() {
  await requireAuth();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Acil durum bildir</h1>
      <EmergencyForm />
    </div>
  );
}
