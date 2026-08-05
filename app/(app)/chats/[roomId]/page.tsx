import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profile/server';
import { ChatRoom } from '@/components/chats/chat-room';

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/auth/login');

  return <ChatRoom roomId={roomId} currentUserId={profile.id} />;
}
