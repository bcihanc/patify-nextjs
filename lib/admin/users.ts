import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

// admin_list_users() satırı (snake_case, RPC'den geldiği gibi). PII YOK — toplu
// listede kasıtlı olarak yok (bkz. plan K4: toplu-export riski). search: username ilike.
type AdminUserRow = {
  id: string;
  username: string;
  created_at: string;
  last_seen: string | null;
  profile_photo: string | null;
  lf_count: number;
  adoption_count: number;
  post_count: number;
  blocks_against: number;
  is_trusted: boolean;
  is_banned: boolean;
};

export type AdminUserListItem = {
  id: string;
  username: string;
  createdAt: string;
  lastSeen: string | null;
  profilePhoto: string | null;
  lfCount: number;
  adoptionCount: number;
  postCount: number;
  blocksAgainst: number;
  isTrusted: boolean;
  isBanned: boolean;
};

function mapUserRow(r: AdminUserRow): AdminUserListItem {
  return {
    id: r.id,
    username: r.username,
    createdAt: r.created_at,
    lastSeen: r.last_seen,
    profilePhoto: r.profile_photo,
    lfCount: r.lf_count,
    adoptionCount: r.adoption_count,
    postCount: r.post_count,
    blocksAgainst: r.blocks_against,
    isTrusted: r.is_trusted,
    isBanned: r.is_banned,
  };
}

// Server Component'ten (admin/users/page.tsx) doğrudan çağrılır. Gerçek bir RPC
// hatasını [] ile maskelemiyoruz — fırlatıp error boundary'ye bırakıyoruz (fail loud,
// bkz. lib/admin/overview.ts aynı sözleşme).
export async function listUsers(search?: string): Promise<AdminUserListItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search?.trim() || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error('listUsers:', error.message);
    throw new Error(`listUsers: ${error.message}`);
  }
  if (!data) return [];
  return (data as AdminUserRow[]).map(mapUserRow);
}

// admin_user_detail() jsonb şekli (snake_case, nested) — K4: tam PII burada, listede değil.
type AdminUserDetailRow = {
  profile: {
    id: string;
    username: string;
    created_at: string;
    last_seen: string | null;
    bio: string | null;
    profile_photo: string | null;
  };
  pii: {
    phone: string | null;
    birth_date: string | null;
    home_city: string | null;
    home_district: string | null;
    consent_accepted_at: string | null;
    tos_version: string | null;
    pp_version: string | null;
    accepts_dms: boolean;
  } | null;
  is_trusted: boolean;
  is_banned: boolean;
  ban: { reason: string | null; banned_until: string | null; created_at: string } | null;
  content: { lost_found: number; adoptions: number; posts: number; emergency: number };
  blocks_against: number;
  reports_against: number;
  recent_moderation: {
    action: string;
    target_entity: string | null;
    reason: string | null;
    created_at: string;
  }[];
};

export type AdminUserDetail = {
  profile: {
    id: string;
    username: string;
    createdAt: string;
    lastSeen: string | null;
    bio: string | null;
    profilePhoto: string | null;
  };
  pii: {
    phone: string | null;
    birthDate: string | null;
    homeCity: string | null;
    homeDistrict: string | null;
    consentAcceptedAt: string | null;
    tosVersion: string | null;
    ppVersion: string | null;
    acceptsDms: boolean;
  } | null;
  isTrusted: boolean;
  isBanned: boolean;
  ban: { reason: string | null; bannedUntil: string | null; createdAt: string } | null;
  content: { lostFound: number; adoptions: number; posts: number; emergency: number };
  blocksAgainst: number;
  reportsAgainst: number;
  recentModeration: {
    action: string;
    targetEntity: string | null;
    reason: string | null;
    createdAt: string;
  }[];
};

function mapUserDetail(r: AdminUserDetailRow): AdminUserDetail {
  return {
    profile: {
      id: r.profile.id,
      username: r.profile.username,
      createdAt: r.profile.created_at,
      lastSeen: r.profile.last_seen,
      bio: r.profile.bio,
      profilePhoto: r.profile.profile_photo,
    },
    pii: r.pii
      ? {
          phone: r.pii.phone,
          birthDate: r.pii.birth_date,
          homeCity: r.pii.home_city,
          homeDistrict: r.pii.home_district,
          consentAcceptedAt: r.pii.consent_accepted_at,
          tosVersion: r.pii.tos_version,
          ppVersion: r.pii.pp_version,
          acceptsDms: r.pii.accepts_dms,
        }
      : null,
    isTrusted: r.is_trusted,
    isBanned: r.is_banned,
    ban: r.ban
      ? { reason: r.ban.reason, bannedUntil: r.ban.banned_until, createdAt: r.ban.created_at }
      : null,
    content: {
      lostFound: r.content.lost_found ?? 0,
      adoptions: r.content.adoptions ?? 0,
      posts: r.content.posts ?? 0,
      emergency: r.content.emergency ?? 0,
    },
    blocksAgainst: r.blocks_against ?? 0,
    reportsAgainst: r.reports_against ?? 0,
    recentModeration: (r.recent_moderation ?? []).map((m) => ({
      action: m.action,
      targetEntity: m.target_entity,
      reason: m.reason,
      createdAt: m.created_at,
    })),
  };
}

// data null → kullanıcı bulunamadı (sayfa notFound() çağırır). RPC hatası fail loud.
export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_user_detail', { p_user_id: id });
  if (error) {
    console.error('getUserDetail:', error.message);
    throw new Error(`getUserDetail: ${error.message}`);
  }
  if (!data) return null;
  // Returns: Json (tekil jsonb) — supabase-js bunu geniş union olarak tipliyor,
  // düz cast ile aşılıyor (bkz. lib/admin/overview.ts aynı desen).
  return mapUserDetail(data as unknown as AdminUserDetailRow);
}
