import { notFound, redirect } from 'next/navigation';
import { ListingForm } from '@/components/lost-found/listing-form';
import { updateListingAction } from '@/lib/lost-found/actions';
import { getLostFoundDetail } from '@/lib/lost-found/read';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/lib/supabase/server';

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await requireAuth();

  const listing = await getLostFoundDetail(id);
  if (!listing) notFound();
  if (listing.userId !== me.id) redirect(`/lost-found/${id}`);

  // Owner-only, çip numarası ana listing okumasında yok — ayrı hydrate.
  const supabase = await createClient();
  const { data: priv } = await supabase
    .from('lost_found_private')
    .select('cip_no')
    .eq('lost_found_id', id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">İlanı düzenle</h1>
      <ListingForm
        mode="edit"
        initial={{ listing, cipNo: priv?.cip_no ?? null }}
        onSubmit={updateListingAction.bind(null, id)}
      />
    </div>
  );
}
