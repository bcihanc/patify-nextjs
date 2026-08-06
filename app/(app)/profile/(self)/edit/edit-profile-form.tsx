'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { User } from 'lucide-react';
import { updateProfileAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TURKEY_CITIES, TURKEY_DISTRICTS, matchTurkeyCity, matchTurkeyDistrict } from '@/lib/geo/turkey';
import type { CurrentUserProfile } from '@/lib/profile/types';
import { avatarUrl, uploadAvatar } from '@/lib/storage/avatar';
import { createClient } from '@/lib/supabase/client';

const BIO_MAX = 160;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

type ReverseGeocodeResponse = { province: string | null; district: string | null };

export function EditProfileForm({ profile }: { profile: CurrentUserProfile }) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [bio, setBio] = useState(profile.bio ?? '');
  const [xUrl, setXUrl] = useState(profile.x_url ?? '');
  const [instagramUrl, setInstagramUrl] = useState(profile.instagram_url ?? '');
  const [telegramUrl, setTelegramUrl] = useState(profile.telegram_url ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(profile.tiktok_url ?? '');
  const [facebookUrl, setFacebookUrl] = useState(profile.facebook_url ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');

  const [homeCity, setHomeCity] = useState<string | null>(profile.homeCity);
  const [homeDistrict, setHomeDistrict] = useState<string | null>(profile.homeDistrict);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Same object-URL lifecycle as complete-profile's step2-avatar-bio.tsx.
  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setAvatarError(null);
    if (selected && !ALLOWED_AVATAR_TYPES.includes(selected.type)) {
      setAvatarError('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin.');
      setAvatarFile(null);
      e.target.value = '';
      return;
    }
    setAvatarFile(selected);
  }

  function handleCityChange(e: ChangeEvent<HTMLSelectElement>) {
    const city = e.target.value || null;
    setHomeCity(city);
    setHomeDistrict((prev) => {
      if (!city || !prev) return null;
      return TURKEY_DISTRICTS[city]?.includes(prev) ? prev : null;
    });
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
          const supabase = createClient();
          const { data, error } = await supabase.functions.invoke<ReverseGeocodeResponse>(
            'reverse-geocode',
            { body: { lat: position.coords.latitude, lng: position.coords.longitude } },
          );
          if (error) throw error;

          const city = matchTurkeyCity(data?.province ?? null);
          if (!city) {
            setGeoError('Konumun bilinen bir şehirle eşleşmedi, elle seçebilirsin.');
            return;
          }
          setHomeCity(city);
          setHomeDistrict(matchTurkeyDistrict(city, data?.district ?? null));
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

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const profilePhoto = avatarFile ? await uploadAvatar(avatarFile) : null;

      const result = await updateProfileAction({
        bio,
        xUrl,
        instagramUrl,
        telegramUrl,
        tiktokUrl,
        facebookUrl,
        phone,
        profilePhoto,
        homeCity,
        homeDistrict,
      });

      if ('error' in result) {
        setSubmitError(result.error);
        return;
      }

      // Mirror only after a successful save — profile is the source of
      // truth, localStorage just reflects what actually got persisted
      // (spec §4.4: "profil kazanır → cihaza aynala").
      if (homeCity) window.localStorage.setItem('home_city', homeCity);
      else window.localStorage.removeItem('home_city');
      if (homeDistrict) window.localStorage.setItem('home_district', homeDistrict);
      else window.localStorage.removeItem('home_district');

      setAvatarFile(null);
      setSubmitSuccess(true);
    } catch {
      setSubmitError('Kaydedilemedi, tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  }

  const currentAvatarUrl = previewUrl ?? (profile.profile_photo ? avatarUrl(profile.profile_photo) : null);
  const districtOptions = homeCity ? (TURKEY_DISTRICTS[homeCity] ?? []) : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        {currentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- consistent with the rest of the app; next/image remotePatterns is intentionally not configured yet
          <img
            src={currentAvatarUrl}
            alt=""
            className="h-24 w-24 rounded-full border border-border bg-secondary object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground">
            <User className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-col items-center gap-1.5">
          <Label htmlFor="avatar">Profil fotoğrafı</Label>
          <input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="text-sm"
          />
          {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Kendinden ve evcil hayvanından bahset…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-right text-xs text-muted-foreground">{bio.length}/{BIO_MAX}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="xUrl">X (Twitter)</Label>
          <Input id="xUrl" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instagramUrl">Instagram</Label>
          <Input id="instagramUrl" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telegramUrl">Telegram</Label>
          <Input id="telegramUrl" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tiktokUrl">TikTok</Label>
          <Input id="tiktokUrl" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="facebookUrl">Facebook</Label>
          <Input id="facebookUrl" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/…" />
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
            <Label htmlFor="homeCity">İl</Label>
            <select id="homeCity" value={homeCity ?? ''} onChange={handleCityChange} className={selectClass}>
              <option value="">Seçilmedi</option>
              {TURKEY_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="homeDistrict">İlçe</Label>
            <select
              id="homeDistrict"
              value={homeDistrict ?? ''}
              onChange={(e) => setHomeDistrict(e.target.value || null)}
              disabled={!homeCity}
              className={selectClass}
            >
              <option value="">Seçilmedi</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      {submitSuccess && <p className="text-sm text-primary">Kaydedildi.</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </form>
  );
}
