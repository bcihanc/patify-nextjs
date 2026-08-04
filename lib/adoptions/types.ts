import { PetType, PetGender, LfUserSummary, PET_TYPE_LABELS, petTypeLabel } from '@/lib/lost-found/types';

export type AdoptionStatus = 'open' | 'closed' | 'pasif';
export type AdoptionSource = 'street' | 'shelter' | 'home' | 'temporary_home' | 'veterinary_clinic';
export type PetSize = 'small' | 'medium' | 'large';
export type PetAge = 'baby' | 'young' | 'adult' | 'senior';

export const ADOPTION_STATUS_LABELS: Record<AdoptionStatus, string> = {
  open: 'Açık',
  closed: 'Sahiplendirildi',
  pasif: 'Pasif',
};

export const ADOPTION_SOURCE_LABELS: Record<AdoptionSource, string> = {
  street: 'Sokak',
  shelter: 'Barınak',
  home: 'Ev',
  temporary_home: 'Geçici ev',
  veterinary_clinic: 'Veteriner kliniği',
};

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  small: 'Küçük',
  medium: 'Orta',
  large: 'Büyük',
};

export const PET_AGE_LABELS: Record<PetAge, string> = {
  baby: 'Yavru',
  young: 'Genç',
  adult: 'Yetişkin',
  senior: 'Yaşlı',
};

export const PERSONALITY_TAGS = ['sakin', 'oyuncu', 'enerjik', 'korkak', 'sevecen', 'bagimsiz', 'sosyal'] as const;
export type PersonalityTag = (typeof PERSONALITY_TAGS)[number];

export const PERSONALITY_TAG_LABELS: Record<PersonalityTag, string> = {
  sakin: 'Sakin',
  oyuncu: 'Oyuncu',
  enerjik: 'Enerjik',
  korkak: 'Korkak',
  sevecen: 'Sevecen',
  bagimsiz: 'Bağımsız',
  sosyal: 'Sosyal',
};

export type AdoptionExtraInfo = {
  healthNotes?: string | null;
  personalityTags: string[];
  personalityDesc?: string | null;
  adoptionRequirements?: string | null;
  returnPolicy?: string | null;
};

// Browse/nearby sayfalama boyutu — read.ts (server-only) VE client bileşenlerinden ortak kullanım için burada.
export const PER_PAGE = 10;

// Non-owner reads carry MASKED lat/long (grid ~100-150m); owner reads carry raw.
export type AdoptionListing = {
  id: string;
  createdAt: string;
  userId: string;
  user: LfUserSummary | null;
  title: string;
  breed: string | null;
  description: string | null;
  source: AdoptionSource | null;
  type: PetType;
  gender: PetGender | null;
  size: PetSize | null;
  age: PetAge | null;
  status: AdoptionStatus;
  city: string;
  district: string | null;
  images: string[] | null; // full URLs
  adopted: boolean;
  commentEnabled: boolean;
  neutered: boolean | null;
  vaccinated: boolean | null;
  goodWithKids: boolean | null;
  goodWithPets: boolean | null;
  extraInfo: AdoptionExtraInfo | null;
  lat: number | null;
  long: number | null;
  distMeters: number | null;
  lifecycleLastActivityAt: string;
};

export type AdoptionFilters = {
  sources: AdoptionSource[];
  types: PetType[];
  sizes: PetSize[];
  ages: PetAge[];
  genders: PetGender[];
  city: string | null;
  district: string | null;
  radiusKm: number | null;
  search: string;
  neutered: boolean | null;
  vaccinated: boolean | null;
  goodWithKids: boolean | null;
  goodWithPets: boolean | null;
};

export const EMPTY_ADOPTION_FILTERS: AdoptionFilters = {
  sources: [],
  types: [],
  sizes: [],
  ages: [],
  genders: [],
  city: null,
  district: null,
  radiusKm: null,
  search: '',
  neutered: null,
  vaccinated: null,
  goodWithKids: null,
  goodWithPets: null,
};

// RPC row (snake_case) — browse/nearby/in_bounds ortak şekli.
export type AdoptionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user: { id: string; username: string | null; profile_photo: string | null; created_at: string } | null;
  title: string;
  breed: string | null;
  description: string | null;
  comment_enabled: boolean;
  source: AdoptionSource | null;
  gender: PetGender | null;
  size: PetSize | null;
  age: PetAge | null;
  type: PetType;
  images: string[] | null; // bare filenames
  videos: string[] | null;
  adopted: boolean;
  city: string;
  district: string | null;
  lat: number | null;
  long: number | null;
  dist_meters: number | null;
  neutered: boolean | null;
  vaccinated: boolean | null;
  good_with_kids: boolean | null;
  good_with_pets: boolean | null;
  extra_info: AdoptionExtraInfo | null;
  status: AdoptionStatus;
  lifecycle_last_activity_at: string;
  application_questions: unknown | null;
};

// Re-export from lost-found for convenience
export type { PetType, PetGender, LfUserSummary };
export { PET_TYPE_LABELS, petTypeLabel };
