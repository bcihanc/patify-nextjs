'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasActiveFilters, withCity, withDistrict, withRadius } from '@/lib/lost-found/filters';
import {
  EMPTY_LF_FILTERS,
  LF_STATUS_LABELS,
  PET_COLORS,
  PET_COLOR_LABELS,
  PET_TYPE_LABELS,
} from '@/lib/lost-found/types';
import type { LfFilters, LfStatus, PetColorKey, PetType } from '@/lib/lost-found/types';
import { TURKEY_CITIES, TURKEY_DISTRICTS } from '@/lib/geo/turkey';
import { cn } from '@/lib/utils';

const RADIUS_PRESETS_KM = [1, 5, 10, 25, 50] as const;
// pasif is never offered as a filter (design spec §6.5).
const FILTERABLE_STATUSES: readonly LfStatus[] = ['kayip', 'bulundu', 'cozuldu'];
const SEARCH_DEBOUNCE_MS = 300;

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

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

export function LfFilterBar({
  filters,
  onChange,
}: {
  filters: LfFilters;
  onChange: (next: LfFilters) => void;
}) {
  const [searchDraft, setSearchDraft] = useState(filters.search);

  // Keep the draft in sync with external resets (e.g. "Filtreleri temizle").
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  // Commit the search box after a pause, same debounce idiom as
  // complete-profile's username availability check. `filters` is a dep too —
  // not just `searchDraft` — so a city/type/etc. change made while a search
  // edit is still pending resets the timer against the *current* filters
  // instead of firing later with a stale closure that would silently revert
  // that other change.
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
        <Label htmlFor="lf-search">Ara</Label>
        <Input
          id="lf-search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Cins, açıklama…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lf-city">İl</Label>
          <select
            id="lf-city"
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
          <Label htmlFor="lf-district">İlçe</Label>
          <select
            id="lf-district"
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
        <Label>Durum</Label>
        <div className="flex flex-wrap gap-2">
          {FILTERABLE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={chipClass(filters.statuses.includes(status))}
              onClick={() => onChange({ ...filters, statuses: toggleValue(filters.statuses, status) })}
            >
              {LF_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Renk</Label>
        <div className="flex flex-wrap gap-2">
          {PET_COLORS.map((color: PetColorKey) => (
            <button
              key={color}
              type="button"
              className={chipClass(filters.colors.includes(color))}
              onClick={() => onChange({ ...filters, colors: toggleValue(filters.colors, color) })}
            >
              {PET_COLOR_LABELS[color]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="lf-reward-only"
          checked={filters.rewardOnly}
          onCheckedChange={(checked) => onChange({ ...filters, rewardOnly: checked === true })}
        />
        <Label htmlFor="lf-reward-only" className="font-normal">Sadece ödüllü ilanlar</Label>
      </div>

      {hasActiveFilters(filters) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            setSearchDraft('');
            onChange(EMPTY_LF_FILTERS);
          }}
        >
          Filtreleri temizle
        </Button>
      )}
    </div>
  );
}
