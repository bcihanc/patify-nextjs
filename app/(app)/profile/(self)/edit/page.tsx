import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { EditProfileForm } from './edit-profile-form';

export default async function EditProfilePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Profili düzenle</h1>
      <EditProfileForm profile={profile} />
    </div>
  );
}
