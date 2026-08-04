export type LfStatus = 'kayip' | 'bulundu' | 'cozuldu' | 'pasif';
export type PetType =
  | 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster'
  | 'fish' | 'turtle' | 'reptile' | 'other';
export type PetGender = 'male' | 'female';
export type PetColorKey =
  | 'beyaz' | 'siyah' | 'gri' | 'kahverengi'
  | 'sari_krem' | 'kizil_turuncu' | 'alacali';

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: 'Köpek', cat: 'Kedi', bird: 'Kuş', rabbit: 'Tavşan', hamster: 'Hamster',
  fish: 'Balık', turtle: 'Kaplumbağa', reptile: 'Sürüngen', other: 'Diğer',
};
export const PET_GENDER_LABELS: Record<PetGender, string> = { male: 'Erkek', female: 'Dişi' };
export const PET_COLORS: PetColorKey[] = ['beyaz','siyah','gri','kahverengi','sari_krem','kizil_turuncu','alacali'];
export const PET_COLOR_LABELS: Record<PetColorKey, string> = {
  beyaz: 'Beyaz', siyah: 'Siyah', gri: 'Gri', kahverengi: 'Kahverengi',
  sari_krem: 'Sarı / Krem', kizil_turuncu: 'Kızıl / Turuncu', alacali: 'Alacalı',
};
export const LF_STATUS_LABELS: Record<LfStatus, string> = {
  kayip: 'Kayıp', bulundu: 'Bulundu', cozuldu: 'Ailesine kavuştu', pasif: 'Pasif',
};

export function petTypeLabel(t: PetType): string { return PET_TYPE_LABELS[t] ?? 'Diğer'; }

// Browse/nearby sayfalama boyutu — read.ts (server-only) VE client bileşenlerinden (browse-list.tsx)
// ortak kullanım için burada (types.ts server-only import taşımaz, client'a güvenle import edilir).
export const PER_PAGE = 10;

export type LfUserSummary = { id: string; username: string | null; profilePhoto: string | null };

// Non-owner reads carry MASKED lat/long (grid ~100-150m); owner reads carry raw.
export type LostFoundListing = {
  id: string;
  createdAt: string;
  userId: string;
  user: LfUserSummary | null;
  type: PetType;
  breed: string | null;
  color: string | null;
  gender: PetGender | null;
  city: string;
  district: string | null;
  status: LfStatus;
  lostDate: string | null;
  description: string | null;
  images: string[] | null; // full URLs
  lat: number | null;
  long: number | null;
  distMeters: number | null;
  rewardOffered: boolean;
  rewardAmount: number | null;
};

export type LfFilters = {
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  types: PetType[];
  statuses: LfStatus[]; // 'pasif' UI'da sunulmaz
  colors: PetColorKey[];
  search: string;
  rewardOnly: boolean;
};

export const EMPTY_LF_FILTERS: LfFilters = {
  city: null, district: null, radiusKm: null, types: [], statuses: [], colors: [], search: '', rewardOnly: false,
};

// RPC row (snake_case) — browse/nearby/in_bounds ortak şekli.
export type LfListRow = {
  id: string;
  created_at: string;
  user_id: string;
  user: { id: string; username: string | null; profile_photo: string | null; created_at: string } | null;
  type: PetType;
  breed: string | null;
  color: string | null;
  gender: PetGender | null;
  city: string;
  district: string | null;
  status: LfStatus;
  lost_date: string | null;
  description: string | null;
  images: string[] | null; // bare filenames
  lat: number | null;
  long: number | null;
  dist_meters: number | null;
  reward_offered: boolean;
  reward_amount: number | null;
};
