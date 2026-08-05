import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { ChatInbox } from '@/components/chats/chat-inbox';

export default async function ChatsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return (
    <div className="mx-auto w-full max-w-2xl px-2 py-4">
      <h1 className="mb-4 px-2 text-xl font-bold">Sohbetler</h1>
      <ChatInbox currentUserId={profile.id} />
    </div>
  );
}
