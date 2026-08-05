import { ListingForm } from '@/components/lost-found/listing-form';
import { createListingAction } from '@/lib/lost-found/actions';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function CreateListingPage() {
  await requireAuth();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">İlan ver</h1>
      <ListingForm mode="create" onSubmit={createListingAction} />
    </div>
  );
}
