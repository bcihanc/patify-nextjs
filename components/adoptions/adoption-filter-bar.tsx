'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasActiveFilters, withCity, withDistrict, withRadius } from '@/lib/adoptions/filters';
import {
  ADOPTION_SOURCE_LABELS,
  EMPTY_ADOPTION_FILTERS,
  PET_AGE_LABELS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
} from '@/lib/adoptions/types';
import type {
  AdoptionFilters, AdoptionSource, PetAge, PetGender, PetSize, PetType,
} from '@/lib/adoptions/types';
import { TURKEY_CITIES, TURKEY_DISTRICTS } from '@/lib/geo/turkey';
import { cn } from '@/lib/utils';

const RADIUS_PRESETS_KM = [1, 5, 10, 25, 50] as const;
const SEARCH_DEBOUNCE_MS = 300;

// Adoptions have no status filter chips — browse hides `pasif` server-side
// and `open`/`closed` aren't offered as a filter (design spec §5.5).
const BOOLEAN_TOGGLES: readonly { key: keyof BoolFilters; label: string }[] = [
  { key: 'neutered', label: 'Kısırlaştırılmış' },
  { key: 'vaccinated', label: 'Aşılı' },
  { key: 'goodWithKids', label: 'Çocuklarla uyumlu' },
  { key: 'goodWithPets', label: 'Diğer hayvanlarla uyumlu' },
];

type BoolFilters = Pick<AdoptionFilters, 'neutered' | 'vaccinated' | 'goodWithKids' | 'goodWithPets'>;

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

function toggleValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function AdoptionFilterBar({
  filters,
  onChange,
}: {
  filters: AdoptionFilters;
  onChange: (next: AdoptionFilters) => void;
}) {
  const [searchDraft, setSearchDraft] = useState(filters.search);

  // Keep the draft in sync with external resets (e.g. "Filtreleri temizle").
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  // Commit the search box after a pause, same debounce idiom as F3's
  // LfFilterBar. `filters` is a dep too — not just `searchDraft` — so a
  // city/type/etc. change made while a search edit is still pending resets
  // the timer against the *current* filters instead of firing later with a
  // stale closure that would silently revert that other change.
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchDraft });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, filters, onChange]);

  const districtOptions = filters.city ? (TURKEY_DISTRICTS[filters.city] ?? []) : [];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adoption-search">Ara</Label>
        <Input
          id="adoption-search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Cins, açıklama…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adoption-city">İl</Label>
          <select
            id="adoption-city"
            value={filters.city ?? ''}
            onChange={(e) => onChange(withCity(filters, e.target.value || null))}
            className={selectClass}
          >
            <option value="">Tüm şehirler</option>
            {TURKEY_CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adoption-district">İlçe</Label>
          <select
            id="adoption-district"
            value={filters.district ?? ''}
            onChange={(e) => onChange(withDistrict(filters, e.target.value || null))}
            disabled={!filters.city}
            className={selectClass}
          >
            <option value="">Tüm ilçeler</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Yakınımda (şehir/ilçe yerine)</Label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS_KM.map((km) => (
            <button
              key={km}
              type="button"
              className={chipClass(filters.radiusKm === km)}
              onClick={() => onChange(withRadius(filters, filters.radiusKm === km ? null : km))}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kaynak</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ADOPTION_SOURCE_LABELS) as [AdoptionSource, string][]).map(([source, label]) => (
            <button
              key={source}
              type="button"
              className={chipClass(filters.sources.includes(source))}
              onClick={() => onChange({ ...filters, sources: toggleValue(filters.sources, source) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tür</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PET_TYPE_LABELS) as [PetType, string][]).map(([type, label]) => (
            <button
              key={type}
              type="button"
              className={chipClass(filters.types.includes(type))}
              onClick={() => onChange({ ...filters, types: toggleValue(filters.types, type) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Boyut</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PET_SIZE_LABELS) as [PetSize, string][]).map(([size, label]) => (
            <button
              key={size}
              type="button"
              className={chipClass(filters.sizes.includes(size))}
              onClick={() => onChange({ ...filters, sizes: toggleValue(filters.sizes, size) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Yaş</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PET_AGE_LABELS) as [PetAge, string][]).map(([age, label]) => (
            <button
              key={age}
              type="button"
              className={chipClass(filters.ages.includes(age))}
              onClick={() => onChange({ ...filters, ages: toggleValue(filters.ages, age) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Cinsiyet</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PET_GENDER_LABELS) as [PetGender, string][]).map(([gender, label]) => (
            <button
              key={gender}
              type="button"
              className={chipClass(filters.genders.includes(gender))}
              onClick={() => onChange({ ...filters, genders: toggleValue(filters.genders, gender) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Özellikler</Label>
        <div className="flex flex-wrap gap-2">
          {BOOLEAN_TOGGLES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={chipClass(filters[key] === true)}
              // true → null on re-click; never false (RPC param semantics — see filters.ts).
              onClick={() => onChange({ ...filters, [key]: filters[key] === true ? null : true })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters(filters) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            setSearchDraft('');
            onChange(EMPTY_ADOPTION_FILTERS);
          }}
        >
          Filtreleri temizle
        </Button>
      )}
    </div>
  );
}
