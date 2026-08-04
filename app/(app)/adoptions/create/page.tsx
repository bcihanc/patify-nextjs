import { redirect } from 'next/navigation';
import { AdoptionForm } from '@/components/adoptions/adoption-form';
import { createAdoptionAction } from '@/lib/adoptions/actions';
import { getCurrentUserProfile } from '@/lib/profile/server';

export default async function CreateAdoptionPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect('/auth/login');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Sahiplendirme ilanı ver</h1>
      <AdoptionForm mode="create" onSubmit={createAdoptionAction} />
    </div>
  );
}
