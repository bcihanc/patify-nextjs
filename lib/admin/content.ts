import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

export type ContentSurface = 'lost_found' | 'adoptions' | 'emergency';

// admin_content_list() satırı (snake_case, RPC'den geldiği gibi). preview: surface'e
// göre RPC tarafında seçiliyor (lost_found→description, adoptions→title, emergency→title/description).
type AdminContentRow = {
  id: string;
  owner_id: string;
  owner_username: string;
  status: string;
  preview: string;
  created_at: string;
  reports_count: number;
};

export type AdminContentItem = {
  id: string;
  ownerId: string;
  ownerUsername: string;
  status: string;
  preview: string;
  createdAt: string;
  reportsCount: number;
};

function mapContentRow(r: AdminContentRow): AdminContentItem {
  return {
    id: r.id,
    ownerId: r.owner_id,
    ownerUsername: r.owner_username,
    status: r.status,
    preview: r.preview,
    createdAt: r.created_at,
    reportsCount: r.reports_count,
  };
}

// Server Component'ten (admin/content/page.tsx) doğrudan çağrılır. Gerçek bir RPC
// hatasını [] ile maskelemiyoruz — fırlatıp error boundary'ye bırakıyoruz (fail loud,
// bkz. lib/admin/overview.ts aynı sözleşme).
export async function listContent(surface: ContentSurface, status?: string): Promise<AdminContentItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_content_list', {
    p_surface: surface,
    p_status: status || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error(`listContent(${surface}):`, error.message);
    throw new Error(`listContent(${surface}): ${error.message}`);
  }
  if (!data) return [];
  return (data as AdminContentRow[]).map(mapContentRow);
}
