import { notFound, redirect } from 'next/navigation';
import { AdoptionForm } from '@/components/adoptions/adoption-form';
import { updateAdoptionAction } from '@/lib/adoptions/actions';
import { getAdoptionById } from '@/lib/adoptions/read';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function EditAdoptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await requireAuth();

  const listing = await getAdoptionById(id);
  if (!listing) notFound();
  if (listing.userId !== me.id) redirect(`/adoptions/${id}`);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">İlanı düzenle</h1>
      <AdoptionForm
        mode="edit"
        initial={{ listing }}
        onSubmit={updateAdoptionAction.bind(null, id)}
      />
    </div>
  );
}
