'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasActiveFilters, withCity, withDistrict, withRadius } from '@/lib/emergency/filters';
import {
  EMERGENCY_KIND_LABELS,
  EMERGENCY_STATUS_LABELS,
  EMPTY_EMERGENCY_FILTERS,
} from '@/lib/emergency/types';
import type { EmergencyFilters, EmergencyKind, EmergencyStatus } from '@/lib/emergency/types';
import { TURKEY_CITIES, TURKEY_DISTRICTS } from '@/lib/geo/turkey';
import { cn } from '@/lib/utils';

const RADIUS_PRESETS_KM = [1, 5, 10, 25, 50] as const;
const SEARCH_DEBOUNCE_MS = 300;

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

export function EmergencyFilterBar({
  filters,
  onChange,
}: {
  filters: EmergencyFilters;
  onChange: (next: EmergencyFilters) => void;
}) {
  const [searchDraft, setSearchDraft] = useState(filters.search);

  // Keep the draft in sync with external resets (e.g. "Filtreleri temizle").
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  // Commit the search box after a pause, same debounce idiom as Adoptions'
  // AdoptionFilterBar. `filters` is a dep too — not just `searchDraft` — so a
  // city/kind/etc. change made while a search edit is still pending resets
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
        <Label htmlFor="emergency-search">Ara</Label>
        <Input
          id="emergency-search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Açıklama…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergency-city">İl</Label>
          <select
            id="emergency-city"
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
          <Label htmlFor="emergency-district">İlçe</Label>
          <select
            id="emergency-district"
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
          {(Object.entries(EMERGENCY_KIND_LABELS) as [EmergencyKind, string][]).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              className={chipClass(filters.kinds.includes(kind))}
              onClick={() => onChange({ ...filters, kinds: toggleValue(filters.kinds, kind) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Durum</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EMERGENCY_STATUS_LABELS) as [EmergencyStatus, string][]).map(([status, label]) => (
            <button
              key={status}
              type="button"
              className={chipClass(filters.statuses.includes(status))}
              onClick={() => onChange({ ...filters, statuses: toggleValue(filters.statuses, status) })}
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
            onChange(EMPTY_EMERGENCY_FILTERS);
          }}
        >
          Filtreleri temizle
        </Button>
      )}
    </div>
  );
}
