import { AdoptionForm } from '@/components/adoptions/adoption-form';
import { createAdoptionAction } from '@/lib/adoptions/actions';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function CreateAdoptionPage() {
  await requireAuth();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Sahiplendirme ilanı ver</h1>
      <AdoptionForm mode="create" onSubmit={createAdoptionAction} />
    </div>
  );
}
