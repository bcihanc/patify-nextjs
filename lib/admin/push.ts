import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

export type PushAuditItem = {
  id: number;
  senderId: string | null;
  senderUsername: string | null;
  receiverId: string | null;
  receiverUsername: string | null;
  createdAt: string;
};

type PushAuditRow = {
  id: number;
  sender_id: string | null;
  sender_username: string | null;
  receiver_id: string | null;
  receiver_username: string | null;
  created_at: string;
};

function mapPushAudit(r: PushAuditRow): PushAuditItem {
  return {
    id: r.id,
    senderId: r.sender_id,
    senderUsername: r.sender_username,
    receiverId: r.receiver_id,
    receiverUsername: r.receiver_username,
    createdAt: r.created_at,
  };
}

// Fail loud (bkz. lib/admin/ops.ts) — RPC hatasını [] ile maskelemiyoruz.
export async function getPushAudit(): Promise<PushAuditItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_push_audit', { p_limit: 200 });
  if (error) {
    console.error('getPushAudit:', error.message);
    throw new Error(`getPushAudit: ${error.message}`);
  }
  if (!data) return [];
  return (data as PushAuditRow[]).map(mapPushAudit);
}
