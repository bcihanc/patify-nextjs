import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { CompleteProfileWizard } from './complete-profile-wizard';

export default async function CompleteProfilePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return (
    <CompleteProfileWizard userId={profile.id} hasUsername={profile.username != null} />
  );
}
