'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/lost-found/location-picker';
import { TURKEY_CITIES, TURKEY_DISTRICTS, matchTurkeyCity, matchTurkeyDistrict } from '@/lib/geo/turkey';
import type { AdoptionInput } from '@/lib/adoptions/actions';
import {
  ADOPTION_SOURCE_LABELS,
  ADOPTION_STATUS_LABELS,
  PERSONALITY_TAGS,
  PERSONALITY_TAG_LABELS,
  PET_AGE_LABELS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
} from '@/lib/adoptions/types';
import type {
  AdoptionExtraInfo, AdoptionListing, AdoptionSource, AdoptionStatus, PersonalityTag,
  PetAge, PetGender, PetSize, PetType,
} from '@/lib/adoptions/types';
import { ALLOWED_LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX, uploadListingImages } from '@/lib/storage/listing-images';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;
const EXTRA_TEXT_MAX = 1000;

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const textareaClass =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function chipClass(selected: boolean): string {
  return cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    selected
      ? 'border-transparent bg-primary text-primary-foreground'
      : 'border-input bg-background text-foreground hover:bg-accent',
  );
}

type ReverseGeocodeResponse = { province: string | null; district: string | null };
type SubmitResult = { ok: true; id?: string } | { error: string };

export type AdoptionFormInitial = {
  listing: AdoptionListing;
};

export type AdoptionFormProps = {
  mode: 'create' | 'edit';
  initial?: AdoptionFormInitial;
  onSubmit: (input: AdoptionInput & { keepExistingLocation?: boolean }) => Promise<SubmitResult>;
};

export function AdoptionForm({ mode, initial, onSubmit }: AdoptionFormProps) {
  const router = useRouter();

  const [existingImages, setExistingImages] = useState<string[]>(initial?.listing.images ?? []);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.listing.title ?? '');
  const [petType, setPetType] = useState<PetType | ''>(initial?.listing.type ?? '');

  // closed/pasif are owner-action-only states (markAdopted/reactivate, Task 10) — the
  // edit form has no status control of its own (unlike F3's kayip/bulundu), so locking
  // here just disables the pet-detail fields for those two statuses. Mirrors F3
  // listing-form.tsx's statusLocked/actualStatus pattern.
  const actualStatus: AdoptionStatus = initial?.listing.status ?? 'open';
  const statusLocked = mode === 'edit' && (actualStatus === 'closed' || actualStatus === 'pasif');

  const [city, setCity] = useState<string | null>(initial?.listing.city ?? null);
  const [district, setDistrict] = useState<string | null>(initial?.listing.district ?? null);
  // Source of truth for <LocationPicker> below — it writes here via onChange(wkt);
  // handleFindLocation/handleCityChange/handleDistrictChange also read/write it.
  const [locationWkt, setLocationWkt] = useState<string | null>(
    initial?.listing.lat != null && initial?.listing.long != null
      ? `POINT(${initial.listing.long} ${initial.listing.lat})`
      : null,
  );
  // Location is NOT NULL on adoptions (unlike F3's optional location) — there's no
  // "clear" affordance. This only tracks whether the user changed it away from the
  // hydrated initial value, so edit-mode can send keepExistingLocation instead of
  // resubmitting an untouched pin.
  const [locationTouched, setLocationTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [breed, setBreed] = useState(initial?.listing.breed ?? '');
  const [source, setSource] = useState<AdoptionSource | null>(initial?.listing.source ?? null);
  const [gender, setGender] = useState<PetGender | null>(initial?.listing.gender ?? null);
  const [size, setSize] = useState<PetSize | null>(initial?.listing.size ?? null);
  const [age, setAge] = useState<PetAge | null>(initial?.listing.age ?? null);

  // Listing attributes, not filters — always a concrete true/false (spec: "Send
  // them as booleans"), never the tri-state true/null the browse filters use.
  const [neutered, setNeutered] = useState(Boolean(initial?.listing.neutered));
  const [vaccinated, setVaccinated] = useState(Boolean(initial?.listing.vaccinated));
  const [goodWithKids, setGoodWithKids] = useState(Boolean(initial?.listing.goodWithKids));
  const [goodWithPets, setGoodWithPets] = useState(Boolean(initial?.listing.goodWithPets));

  const [personalityTags, setPersonalityTags] = useState<string[]>(
    initial?.listing.extraInfo?.personalityTags ?? [],
  );
  const [personalityDesc, setPersonalityDesc] = useState(initial?.listing.extraInfo?.personalityDesc ?? '');
  const [healthNotes, setHealthNotes] = useState(initial?.listing.extraInfo?.healthNotes ?? '');
  const [adoptionRequirements, setAdoptionRequirements] = useState(
    initial?.listing.extraInfo?.adoptionRequirements ?? '',
  );
  const [returnPolicy, setReturnPolicy] = useState(initial?.listing.extraInfo?.returnPolicy ?? '');
  const [description, setDescription] = useState(initial?.listing.description ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Same object-URL lifecycle idiom as edit-profile-form's avatar preview,
  // generalized to an array of newly-picked files.
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [photos]);

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file after a remove
    if (selected.length === 0) return;
    setPhotoError(null);

    if (selected.some((f) => !ALLOWED_LISTING_IMAGE_TYPES.includes(f.type))) {
      setPhotoError('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin.');
      return;
    }
    if (existingImages.length + photos.length + selected.length > LISTING_IMAGE_MAX) {
      setPhotoError(`En fazla ${LISTING_IMAGE_MAX} fotoğraf ekleyebilirsin.`);
      return;
    }
    setPhotos((prev) => [...prev, ...selected]);
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  function removeNewPhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCityChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value || null;
    setCity(next);
    setDistrict((prev) => {
      if (!next || !prev) return null;
      return TURKEY_DISTRICTS[next]?.includes(prev) ? prev : null;
    });
    // Manuel il değişimi eski pin'i geçersiz kılar — yoksa city=X, location=Y
    // koordinatlarıyla kaydedilebilir (F3 review carry-over, bkz. listing-form.tsx).
    setLocationWkt(null);
    setLocationTouched(true);
  }

  function handleDistrictChange(e: ChangeEvent<HTMLSelectElement>) {
    setDistrict(e.target.value || null);
    // Aynı gerekçe: manuel ilçe değişimi de eski pin'i geçersiz kılar.
    setLocationWkt(null);
    setLocationTouched(true);
  }

  function handlePickerChange(wkt: string | null) {
    setLocationWkt(wkt);
    setLocationTouched(true);
  }

  function togglePersonalityTag(tag: PersonalityTag) {
    setPersonalityTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleFindLocation() {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tarayıcın konum özelliğini desteklemiyor.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const supabase = createClient();
          const { data, error } = await supabase.functions.invoke<ReverseGeocodeResponse>(
            'reverse-geocode',
            { body: { lat: latitude, lng: longitude } },
          );
          if (error) throw error;

          const matchedCity = matchTurkeyCity(data?.province ?? null);
          if (!matchedCity) {
            setGeoError('Konumun bilinen bir şehirle eşleşmedi, elle seçebilirsin.');
            return;
          }
          setCity(matchedCity);
          setDistrict(matchTurkeyDistrict(matchedCity, data?.district ?? null));
          // WKT is longitude-first.
          setLocationWkt(`POINT(${longitude} ${latitude})`);
          setLocationTouched(true);
        } catch {
          setGeoError('Konum çözümlenemedi, elle seçebilirsin.');
        } finally {
          setGeoLoading(false);
        }
      },
      (error) => {
        setGeoLoading(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Konum izni reddedildi, elle seçebilirsin.'
            : 'Konum alınamadı, elle seçebilirsin.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    if (existingImages.length + photos.length === 0) {
      setSubmitError('En az bir fotoğraf ekle.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('Başlık girmelisin.');
      return;
    }
    if (!city) {
      setSubmitError('İl seçmelisin.');
      return;
    }
    // adoptions.location NOT NULL — pin konulmadan submit engellenir (mobil ve
    // createAdoptionAction ile aynı kural).
    if (!locationWkt) {
      setSubmitError("İlanın konumunu haritadan veya 'Konumumu bul' ile belirle.");
      return;
    }
    if (!petType) {
      setSubmitError('Tür seçmelisin.');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = photos.length ? await uploadListingImages(photos) : [];
      const keptExisting = existingImages
        .map((url) => url.split('/').pop())
        .filter((f): f is string => !!f);
      const images = [...keptExisting, ...uploaded];

      const trimmedPersonalityDesc = personalityDesc.trim();
      const trimmedHealthNotes = healthNotes.trim();
      const trimmedAdoptionRequirements = adoptionRequirements.trim();
      const trimmedReturnPolicy = returnPolicy.trim();
      const hasExtraInfo = personalityTags.length > 0 || !!trimmedPersonalityDesc
        || !!trimmedHealthNotes || !!trimmedAdoptionRequirements || !!trimmedReturnPolicy;
      const extraInfo: AdoptionExtraInfo | null = hasExtraInfo ? {
        personalityTags,
        personalityDesc: trimmedPersonalityDesc || null,
        healthNotes: trimmedHealthNotes || null,
        adoptionRequirements: trimmedAdoptionRequirements || null,
        returnPolicy: trimmedReturnPolicy || null,
      } : null;

      const result = await onSubmit({
        title: title.trim(),
        type: petType,
        city,
        district,
        breed: breed.trim() || null,
        description: description.trim() || null,
        source,
        gender,
        size,
        age,
        images,
        neutered,
        vaccinated,
        goodWithKids,
        goodWithPets,
        extraInfo,
        locationWkt,
        // Untouched pin in edit mode → let the action keep the existing location
        // instead of resubmitting it (mirrors F3's clearLocation opt-in signal).
        ...(mode === 'edit' && !locationTouched ? { keepExistingLocation: true } : {}),
      });

      if ('error' in result) {
        setSubmitError(result.error);
        return;
      }
      const targetId = result.id ?? initial?.listing.id;
      if (targetId) router.push(`/adoptions/${targetId}`);
    } catch {
      setSubmitError('Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  }

  const districtOptions = city ? (TURKEY_DISTRICTS[city] ?? []) : [];
  const totalPhotos = existingImages.length + photos.length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label>Fotoğraflar</Label>
        <div className="flex flex-wrap gap-3">
          {existingImages.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(url)}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground"
                aria-label="Fotoğrafı kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photoPreviews.map((url, i) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewPhoto(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground"
                aria-label="Fotoğrafı kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {totalPhotos < LISTING_IMAGE_MAX && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input text-xs text-muted-foreground hover:bg-accent">
              Ekle
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === 'create' ? `En az 1, en fazla ${LISTING_IMAGE_MAX} fotoğraf.` : `En fazla ${LISTING_IMAGE_MAX} fotoğraf.`}
        </p>
        {photoError && <p className="text-sm text-destructive">{photoError}</p>}
      </div>

      {statusLocked && (
        <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
          {ADOPTION_STATUS_LABELS[actualStatus]}
          <p className="mt-1 text-xs text-muted-foreground">
            Bu ilanın durumu ilan detayındaki işlemlerle değişir, buradan düzenlenemez.
          </p>
        </div>
      )}

      {/* closed/pasif: fotoğraflar hariç tüm alanlar kilitli — yalnızca detay
          sayfasındaki owner aksiyonları (markAdopted/reactivate) durumu değiştirir. */}
      <fieldset disabled={statusLocked} className="contents">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Başlık</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          maxLength={TITLE_MAX}
          placeholder="Örn. Sahiplendirilecek sevimli kedi"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">Konum</Label>
          <Button type="button" variant="outline" size="sm" disabled={geoLoading} onClick={handleFindLocation}>
            {geoLoading ? 'Bulunuyor…' : 'Konumumu bul'}
          </Button>
        </div>
        {geoError && <p className="text-sm text-destructive">{geoError}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">İl</Label>
            <select id="city" value={city ?? ''} onChange={handleCityChange} className={selectClass}>
              <option value="">Seçiniz</option>
              {TURKEY_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="district">İlçe</Label>
            <select
              id="district"
              value={district ?? ''}
              onChange={handleDistrictChange}
              disabled={!city}
              className={selectClass}
            >
              <option value="">Seçilmedi</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <LocationPicker
          initial={
            initial?.listing.lat != null && initial?.listing.long != null
              ? { lat: initial.listing.lat, lng: initial.listing.long }
              : null
          }
          onChange={handlePickerChange}
        />
        <p className="text-xs text-muted-foreground">
          İlanın konumu zorunludur. Haritadan bir nokta seç veya &quot;Konumumu bul&quot;u kullan.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="petType">Tür</Label>
        <select
          id="petType"
          value={petType}
          onChange={(e) => setPetType(e.target.value as PetType | '')}
          className={selectClass}
        >
          <option value="">Seçiniz</option>
          {(Object.entries(PET_TYPE_LABELS) as [PetType, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <details className="flex flex-col gap-4 rounded-md border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Detaylar</summary>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Nereden geldi</Label>
            <select
              id="source"
              value={source ?? ''}
              onChange={(e) => setSource((e.target.value || null) as AdoptionSource | null)}
              className={selectClass}
            >
              <option value="">Seçilmedi</option>
              {(Object.entries(ADOPTION_SOURCE_LABELS) as [AdoptionSource, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">Cinsiyet</Label>
              <select
                id="gender"
                value={gender ?? ''}
                onChange={(e) => setGender((e.target.value || null) as PetGender | null)}
                className={selectClass}
              >
                <option value="">Seçilmedi</option>
                {(Object.entries(PET_GENDER_LABELS) as [PetGender, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="size">Boyut</Label>
              <select
                id="size"
                value={size ?? ''}
                onChange={(e) => setSize((e.target.value || null) as PetSize | null)}
                className={selectClass}
              >
                <option value="">Seçilmedi</option>
                {(Object.entries(PET_SIZE_LABELS) as [PetSize, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="age">Yaş</Label>
              <select
                id="age"
                value={age ?? ''}
                onChange={(e) => setAge((e.target.value || null) as PetAge | null)}
                className={selectClass}
              >
                <option value="">Seçilmedi</option>
                {(Object.entries(PET_AGE_LABELS) as [PetAge, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="breed">Cins</Label>
            <Input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Örn. Golden Retriever" />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox id="neutered" checked={neutered} onCheckedChange={(c) => setNeutered(c === true)} />
              <Label htmlFor="neutered" className="font-normal">Kısırlaştırılmış</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="vaccinated" checked={vaccinated} onCheckedChange={(c) => setVaccinated(c === true)} />
              <Label htmlFor="vaccinated" className="font-normal">Aşılı</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="goodWithKids" checked={goodWithKids} onCheckedChange={(c) => setGoodWithKids(c === true)} />
              <Label htmlFor="goodWithKids" className="font-normal">Çocuklarla uyumlu</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="goodWithPets" checked={goodWithPets} onCheckedChange={(c) => setGoodWithPets(c === true)} />
              <Label htmlFor="goodWithPets" className="font-normal">Diğer hayvanlarla uyumlu</Label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Karakter</Label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={chipClass(personalityTags.includes(tag))}
                  onClick={() => togglePersonalityTag(tag)}
                >
                  {PERSONALITY_TAG_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="personalityDesc">Karakter açıklaması</Label>
            <textarea
              id="personalityDesc"
              value={personalityDesc}
              onChange={(e) => setPersonalityDesc(e.target.value.slice(0, EXTRA_TEXT_MAX))}
              maxLength={EXTRA_TEXT_MAX}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="healthNotes">Sağlık notları</Label>
            <textarea
              id="healthNotes"
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value.slice(0, EXTRA_TEXT_MAX))}
              maxLength={EXTRA_TEXT_MAX}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adoptionRequirements">Sahiplenme koşulları</Label>
            <textarea
              id="adoptionRequirements"
              value={adoptionRequirements}
              onChange={(e) => setAdoptionRequirements(e.target.value.slice(0, EXTRA_TEXT_MAX))}
              maxLength={EXTRA_TEXT_MAX}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="returnPolicy">İade koşulları</Label>
            <textarea
              id="returnPolicy"
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value.slice(0, EXTRA_TEXT_MAX))}
              maxLength={EXTRA_TEXT_MAX}
              rows={3}
              className={textareaClass}
            />
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          placeholder="Karakteri, alışkanlıkları, aradığın yuva…"
          className={textareaClass}
        />
        <p className="text-right text-xs text-muted-foreground">{description.length}/{DESCRIPTION_MAX}</p>
      </div>
      </fieldset>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting
          ? (mode === 'create' ? 'Yayınlanıyor…' : 'Kaydediliyor…')
          : (mode === 'create' ? 'İlan ver' : 'Kaydet')}
      </Button>
    </form>
  );
}
