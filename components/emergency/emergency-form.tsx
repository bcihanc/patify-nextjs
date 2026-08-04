'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/lost-found/location-picker';
import { TURKEY_CITIES, TURKEY_DISTRICTS, matchTurkeyCity, matchTurkeyDistrict } from '@/lib/geo/turkey';
import { createEmergencyAction } from '@/lib/emergency/actions';
import { EMERGENCY_KIND_LABELS, PET_TYPE_LABELS } from '@/lib/emergency/types';
import type { EmergencyKind, PetType } from '@/lib/emergency/types';
import { ALLOWED_LISTING_IMAGE_TYPES, uploadListingImages } from '@/lib/storage/listing-images';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const DESCRIPTION_MAX = 2000;

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const textareaClass =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

type ReverseGeocodeResponse = { province: string | null; district: string | null };

export function EmergencyForm() {
  const router = useRouter();

  // Emergency stores a single required photo_url (unlike adoption/LF's images
  // list) — exactly 1 photo, no video, picker capped at 1 (spec: no fallback
  // list logic needed here).
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [kind, setKind] = useState<EmergencyKind | null>(null);
  const [petType, setPetType] = useState<PetType | ''>('');

  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  // Source of truth for <LocationPicker> below — it writes here via onChange(wkt).
  const [locationWkt, setLocationWkt] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Same object-URL lifecycle idiom as adoption-form/listing-form's photo previews.
  useEffect(() => {
    if (!photo) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after a remove
    if (!file) return;
    setPhotoError(null);

    if (!ALLOWED_LISTING_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin.');
      return;
    }
    setPhoto(file);
  }

  function removePhoto() {
    setPhoto(null);
  }

  function handleCityChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value || null;
    setCity(next);
    setDistrict((prev) => {
      if (!next || !prev) return null;
      return TURKEY_DISTRICTS[next]?.includes(prev) ? prev : null;
    });
    // Manuel il değişimi eski pin'i geçersiz kılar — yoksa city=X, location=Y
    // koordinatlarıyla kaydedilebilir (adoption-form/listing-form ile aynı gerekçe).
    setLocationWkt(null);
  }

  function handleDistrictChange(e: ChangeEvent<HTMLSelectElement>) {
    setDistrict(e.target.value || null);
    // Aynı gerekçe: manuel ilçe değişimi de eski pin'i geçersiz kılar.
    setLocationWkt(null);
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

    if (!photo) {
      setSubmitError('Bir fotoğraf ekle.');
      return;
    }
    if (!kind) {
      setSubmitError('Vaka türünü seçmelisin.');
      return;
    }
    if (!city) {
      setSubmitError('İl seçmelisin.');
      return;
    }
    // emergency_cases.location NOT NULL — pin konulmadan submit engellenir.
    // Mobil resolveEmergencySubmitLocation ve createEmergencyAction ile aynı
    // kural: canlı GPS'e ASLA sessizce düşülmez, kullanıcı pini kendi seçmeli.
    if (!locationWkt) {
      setSubmitError('Vakanın konumunu belirlemelisin.');
      return;
    }
    if (!petType) {
      setSubmitError('Tür seçmelisin.');
      return;
    }

    setSubmitting(true);
    try {
      const [photoUrl] = await uploadListingImages([photo]);
      if (!photoUrl) throw new Error('Fotoğraf yüklenemedi');

      const result = await createEmergencyAction({
        kind,
        petType,
        description: description.trim() || null,
        photoUrl,
        locationWkt,
        city,
        district,
      });

      if ('error' in result) {
        setSubmitError(result.error);
        return;
      }
      if (result.id) router.replace(`/emergency/${result.id}`);
    } catch {
      setSubmitError('Fotoğraf yüklenemedi, tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  }

  const districtOptions = city ? (TURKEY_DISTRICTS[city] ?? []) : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label>Fotoğraf</Label>
        <div className="flex flex-wrap gap-3">
          {photoPreview ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet */}
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground"
                aria-label="Fotoğrafı kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input text-xs text-muted-foreground hover:bg-accent">
              Ekle
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Tam 1 fotoğraf gerekli.</p>
        {photoError && <p className="text-sm text-destructive">{photoError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Vaka türü</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(EMERGENCY_KIND_LABELS) as [EmergencyKind, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                kind === value
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
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
        <LocationPicker initial={null} onChange={setLocationWkt} />
        <p className="text-xs text-muted-foreground">
          Vakanın konumu zorunludur. Haritadan bir nokta seç veya &quot;Konumumu bul&quot;u kullan.
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          placeholder="Durumu, görüldüğü yeri, ayırt edici özellikleri anlat…"
          className={textareaClass}
        />
        <p className="text-right text-xs text-muted-foreground">{description.length}/{DESCRIPTION_MAX}</p>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Bildiriliyor…' : 'Vakayı bildir'}
      </Button>
    </form>
  );
}
