"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import { useShoppingRegion } from '@/hooks/use-shopping-region';
import type { ShoppingRegion } from '@/stores/shopping-region-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * "📍 Liège, Belgium — Change".
 *
 * The region decides which price observations count, so it needs to be both
 * visible and correctable. Detection is coarse and IP-based; a choice made
 * here overrides it permanently on this device.
 *
 * Only countries and cities that Open Prices actually holds prices for are
 * offered — picking a place with no observations would just be a slower route
 * to "price unavailable".
 */

interface CountryOption { name: string; code: string; priceCount: number }
interface CityOption { name: string; priceCount: number }

export function RegionPicker({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { region, isManual, isDetecting, setManual, redetect } = useShoppingRegion();

  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryOption[] | null>(null);
  const [cities, setCities] = useState<CityOption[] | null>(null);
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  // Countries are fetched the first time the dialog opens, not on mount — the
  // list is only needed by someone who wants to change something.
  useEffect(() => {
    if (!open || countries) return;
    fetch('/api/region?list=countries')
      .then((r) => r.json())
      .then((b) => setCountries(b?.items ?? []))
      .catch(() => setCountries([]));
  }, [open, countries]);

  useEffect(() => {
    if (!country) { setCities(null); return; }
    setCities(null);
    fetch(`/api/region?list=cities&country=${encodeURIComponent(country.code)}`)
      .then((r) => r.json())
      .then((b) => setCities(b?.items ?? []))
      .catch(() => setCities([]));
  }, [country]);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const list: Array<{ name: string; priceCount: number }> =
      country ? cities ?? [] : countries ?? [];
    if (!needle) return list.slice(0, 120);
    return list.filter((x) => x.name.toLowerCase().includes(needle)).slice(0, 120);
  }, [filter, country, cities, countries]);

  const chooseCountry = (option: CountryOption) => {
    setCountry(option);
    setFilter('');
  };

  const chooseCity = async (name: string) => {
    if (!country) return;
    setSaving(true);
    try {
      // Ask for the city's coordinates so the price engine can search around
      // it rather than falling back to the whole country.
      const response = await fetch(
        `/api/region?resolve=city&name=${encodeURIComponent(name)}&country=${encodeURIComponent(country.code)}`
      );
      const body = await response.json();
      const resolved: ShoppingRegion | null = body?.region ?? null;

      // Take the coordinates from the resolver but the country's name from the
      // list that was just shown. Open Prices reports a location's country in
      // OpenStreetMap's local spelling, so picking Tunisia produced the label
      // "سوسة, تونس" in a French interface.
      setManual({
        country: country.name,
        countryCode: country.code,
        city: name,
        latitude: resolved?.latitude ?? null,
        longitude: resolved?.longitude ?? null,
        label: `${name}, ${country.name}`,
      });
      close();
    } finally {
      setSaving(false);
    }
  };

  const chooseCountryOnly = () => {
    if (!country) return;
    setManual({
      country: country.name,
      countryCode: country.code,
      city: null,
      latitude: null,
      longitude: null,
      label: country.name,
    });
    close();
  };

  const close = () => {
    setOpen(false);
    setCountry(null);
    setFilter('');
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('shoppingRegion')}
          </p>
          <p className="truncate text-sm font-medium">
            {isDetecting
              ? t('regionDetecting')
              : region?.label || t('regionUnknown')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isManual && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => redetect()}
            title={t('regionDetectAgain')}
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        )}
        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">{t('regionChange')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{country ? country.name : t('regionChooseCountry')}</DialogTitle>
              <DialogDescription>
                {country ? t('regionChooseCity') : t('regionChooseCountryHint')}
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('regionSearchPlaceholder')}
                className="pl-9"
              />
            </div>

            {country && (
              <Button variant="secondary" size="sm" onClick={chooseCountryOnly} disabled={saving}>
                {t('regionWholeCountry', { country: country.name })}
              </Button>
            )}

            <ScrollArea className="h-64 rounded-md border">
              {(country ? cities : countries) === null ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : shown.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {t('regionNoMatches')}
                </p>
              ) : (
                <ul className="p-1">
                  {shown.map((option) => (
                    <li key={option.name}>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          country
                            ? chooseCity(option.name)
                            : chooseCountry(option as CountryOption)
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <span className="truncate">{option.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t('regionPriceCount', { count: option.priceCount })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>

            {country && (
              <Button variant="ghost" size="sm" onClick={() => { setCountry(null); setFilter(''); }}>
                {t('regionBackToCountries')}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
