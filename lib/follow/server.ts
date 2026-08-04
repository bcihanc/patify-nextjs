import { createClient } from '@/lib/supabase/server';
import type { FollowCounts, PublicUserSummary } from '@/lib/profile/types';

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const supabase = await createClient();
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('user_followings')
      .select('user_id', { count: 'exact', head: true })
      .eq('followed_user_id', userId),
    supabase
      .from('user_followings')
      .select('followed_user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_followings')
    .select('user_id')
    .eq('user_id', followerId)
    .eq('followed_user_id', followedId)
    .maybeSingle();
  return data != null;
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_blockings')
    .select('user_id')
    .eq('user_id', blockerId)
    .eq('blocked_user_id', blockedId)
    .maybeSingle();
  return data != null;
}

export async function listFollowers(userId: string): Promise<PublicUserSummary[]> {
  const supabase = await createClient();
  // Kolon-hint embed: user_followings'in user_id → user_profiles FK'sını seçer
  // (iki FK var; kolon adı disambiguates). Mobil listFollowers ile aynı kalıp.
  const { data, error } = await supabase
    .from('user_followings')
    .select('follower:user_id(id, username, profile_photo)')
    .eq('followed_user_id', userId)
    .returns<{ follower: PublicUserSummary }[]>();
  if (error) {
    console.error('listFollowers:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.follower);
}

export async function listFollowing(userId: string): Promise<PublicUserSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_followings')
    .select('followed:followed_user_id(id, username, profile_photo)')
    .eq('user_id', userId)
    .returns<{ followed: PublicUserSummary }[]>();
  if (error) {
    console.error('listFollowing:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.followed);
}
