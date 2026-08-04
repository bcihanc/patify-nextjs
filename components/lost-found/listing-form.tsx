'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TURKEY_CITIES, TURKEY_DISTRICTS, matchTurkeyCity, matchTurkeyDistrict } from '@/lib/geo/turkey';
import type { ListingInput } from '@/lib/lost-found/actions';
import {
  LF_STATUS_LABELS,
  PET_COLORS,
  PET_COLOR_LABELS,
  PET_GENDER_LABELS,
  PET_TYPE_LABELS,
} from '@/lib/lost-found/types';
import type { LostFoundListing, PetColorKey, PetGender, PetType } from '@/lib/lost-found/types';
import { ALLOWED_LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX, uploadListingImages } from '@/lib/storage/listing-images';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const DESCRIPTION_MAX = 2000;
const CIP_MAX = 40;
// Only these two are offered on the form (spec §6.7) — cozuldu/pasif are
// lifecycle-only transitions (mark_reunited/reactivate), never picked here.
const CREATE_STATUSES = ['kayip', 'bulundu'] as const;
type CreateStatus = (typeof CREATE_STATUSES)[number];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function chipClass(selected: boolean): string {
  return cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    selected
      ? 'border-transparent bg-primary text-primary-foreground'
      : 'border-input bg-background text-foreground hover:bg-accent',
  );
}

// Defends against stale/foreign color values (e.g. legacy data) rendering a
// chip selection that doesn't correspond to any real PET_COLORS entry.
function asPetColor(c: string | null): PetColorKey | null {
  return c && (PET_COLORS as string[]).includes(c) ? (c as PetColorKey) : null;
}

type ReverseGeocodeResponse = { province: string | null; district: string | null };
type SubmitResult = { ok: true; id?: string } | { error: string };

export type ListingFormInitial = {
  listing: LostFoundListing;
  cipNo: string | null;
};

export type ListingFormProps = {
  mode: 'create' | 'edit';
  initial?: ListingFormInitial;
  onSubmit: (input: ListingInput & { clearLocation?: boolean }) => Promise<SubmitResult>;
};

export function ListingForm({ mode, initial, onSubmit }: ListingFormProps) {
  const router = useRouter();

  const [existingImages, setExistingImages] = useState<string[]>(initial?.listing.images ?? []);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [status, setStatus] = useState<CreateStatus>(
    initial && (initial.listing.status === 'kayip' || initial.listing.status === 'bulundu')
      ? initial.listing.status
      : 'kayip',
  );
  const [petType, setPetType] = useState<PetType | ''>(initial?.listing.type ?? '');

  const [city, setCity] = useState<string | null>(initial?.listing.city ?? null);
  const [district, setDistrict] = useState<string | null>(initial?.listing.district ?? null);
  // Source of truth for the map seam below — Task 12's <LocationPicker>
  // will read/write this same state via onChange(wkt).
  const [locationWkt, setLocationWkt] = useState<string | null>(
    initial?.listing.lat != null && initial?.listing.long != null
      ? `POINT(${initial.listing.long} ${initial.listing.lat})`
      : null,
  );
  const hadInitialLocation = initial?.listing.lat != null && initial?.listing.long != null;
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [breed, setBreed] = useState(initial?.listing.breed ?? '');
  const [gender, setGender] = useState<PetGender | null>(initial?.listing.gender ?? null);
  const [color, setColor] = useState<PetColorKey | null>(asPetColor(initial?.listing.color ?? null));
  const [lostDate, setLostDate] = useState<string>(initial?.listing.lostDate ?? '');
  const [rewardOffered, setRewardOffered] = useState(initial?.listing.rewardOffered ?? false);
  const [rewardAmount, setRewardAmount] = useState(
    initial?.listing.rewardAmount != null ? String(initial.listing.rewardAmount) : '',
  );
  const [cipNo, setCipNo] = useState(initial?.cipNo ?? '');
  const [description, setDescription] = useState<string>(initial?.listing.description ?? '');

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
  }

  function handleStatusChange(next: CreateStatus) {
    setStatus(next);
    // Reward is kayip-only — clear it so a hidden stale toggle never submits.
    if (next !== 'kayip') {
      setRewardOffered(false);
      setRewardAmount('');
    }
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

    if (mode === 'create' && existingImages.length + photos.length === 0) {
      setSubmitError('En az bir fotoğraf ekle.');
      return;
    }
    if (!city) {
      setSubmitError('İl seçmelisin.');
      return;
    }
    if (!petType) {
      setSubmitError('Tür seçmelisin.');
      return;
    }
    let parsedReward: number | null = null;
    if (rewardOffered) {
      const amount = Number(rewardAmount);
      if (!Number.isInteger(amount) || amount <= 0) {
        setSubmitError('Ödül tutarı pozitif bir tam sayı olmalı.');
        return;
      }
      parsedReward = amount;
    }

    setSubmitting(true);
    try {
      const uploaded = photos.length ? await uploadListingImages(photos) : [];
      const keptExisting = existingImages
        .map((url) => url.split('/').pop())
        .filter((f): f is string => !!f);
      const images = [...keptExisting, ...uploaded];

      const result = await onSubmit({
        type: petType,
        status,
        city,
        district,
        breed: breed.trim() || null,
        color,
        gender,
        lostDate: lostDate || null,
        description: description.trim() || null,
        images,
        rewardOffered,
        rewardAmount: parsedReward,
        cipNo: cipNo.trim() || null,
        locationWkt,
        // Only ever an explicit clear — omit=don't touch (see actions.ts).
        ...(hadInitialLocation && locationWkt == null ? { clearLocation: true } : {}),
      });

      if ('error' in result) {
        setSubmitError(result.error);
        return;
      }
      const targetId = result.id ?? initial?.listing.id;
      if (targetId) router.push(`/lost-found/${targetId}`);
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

      <div className="flex flex-col gap-1.5">
        <Label>Durum</Label>
        <div className="flex gap-2">
          {CREATE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                status === s
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent',
              )}
            >
              {LF_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
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
              onChange={(e) => setDistrict(e.target.value || null)}
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
        {/* Task 12: <LocationPicker> map pin-picker slots in here */}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breed">Cins</Label>
          <Input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Örn. Golden Retriever" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cinsiyet</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(PET_GENDER_LABELS) as [PetGender, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={chipClass(gender === value)}
                onClick={() => setGender((prev) => (prev === value ? null : value))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Renk</Label>
          <div className="flex flex-wrap gap-2">
            {PET_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className={chipClass(color === value)}
                onClick={() => setColor((prev) => (prev === value ? null : value))}
              >
                {PET_COLOR_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lostDate">Kayıp/bulunma tarihi</Label>
          <Input id="lostDate" type="date" value={lostDate} onChange={(e) => setLostDate(e.target.value)} />
        </div>

        {status === 'kayip' && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rewardOffered"
                checked={rewardOffered}
                onCheckedChange={(checked) => setRewardOffered(checked === true)}
              />
              <Label htmlFor="rewardOffered" className="font-normal">Ödül teklif ediyorum</Label>
            </div>
            {rewardOffered && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rewardAmount">Ödül tutarı (TL)</Label>
                <Input
                  id="rewardAmount"
                  type="number"
                  min={1}
                  step={1}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cipNo">Çip/kimlik numarası</Label>
          <Input
            id="cipNo"
            value={cipNo}
            onChange={(e) => setCipNo(e.target.value.slice(0, CIP_MAX))}
            maxLength={CIP_MAX}
            placeholder="Sadece sana görünür"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Açıklama</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            placeholder="Ayırt edici özellikler, son görüldüğü yer…"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-right text-xs text-muted-foreground">{description.length}/{DESCRIPTION_MAX}</p>
        </div>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting
          ? (mode === 'create' ? 'Yayınlanıyor…' : 'Kaydediliyor…')
          : (mode === 'create' ? 'İlan ver' : 'Kaydet')}
      </Button>
    </form>
  );
}
