"use client";

import { Info } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import type { IngredientPrice } from '@/hooks/use-ingredient-prices';
import { cn } from '@/lib/utils';

/**
 * An estimated price, shown as an estimate.
 *
 * Open Prices is crowdsourced: coverage varies by country and by food, and
 * what is there is a handful of shelf photographs, not a supermarket feed. So
 * nothing here is ever rendered as an exact price. Every figure carries a "≈",
 * a spread wide enough to be honest is shown as a range, and a food with too
 * few observations says so rather than borrowing a number from somewhere else.
 */

/** Above this relative spread, one number would be overstating what is known. */
const RANGE_THRESHOLD = 0.22;

export function formatMoney(value: number, currency: string, language: string): string {
  try {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-BE' : 'en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: value >= 100 ? 0 : 2,
      minimumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    // An unrecognised currency code should not blank the row.
    return `${value.toFixed(2)} ${currency}`;
  }
}

interface PriceTagProps {
  price: IngredientPrice | null;
  /** Show a low–high band rather than a single midpoint. Totals always do. */
  forceRange?: boolean;
  /** Render nothing at all instead of "unavailable" — used in dense rows. */
  hideWhenUnknown?: boolean;
  className?: string;
  loading?: boolean;
}

export function PriceTag({
  price, forceRange = false, hideWhenUnknown = false, className, loading = false,
}: PriceTagProps) {
  const { t, language } = useTranslation();

  if (!price?.cost) {
    if (hideWhenUnknown) return null;
    return (
      <span
        className={cn('shrink-0 text-xs text-muted-foreground/70', className)}
        title={t('priceUnavailableHint')}
      >
        {loading ? t('priceLoading') : t('priceUnavailable')}
      </span>
    );
  }

  const { value, low, high, currency } = price.cost;
  const spread = value > 0 ? (high - low) / value : 0;
  const asRange = (forceRange || spread > RANGE_THRESHOLD) && high > low;

  // Say plainly where the number came from. A worldwide median and a median
  // from shops down the road are both "estimates", but they are not the same
  // claim, so the tooltip names the scope rather than blurring the two.
  const { scope, observationCount, region, lastObservedAt } = price.estimate;
  const scopeKey =
    scope === 'nearby' ? 'priceScopeNearby'
    : scope === 'country' ? 'priceScopeCountry'
    : 'priceScopeGlobal';

  const hint = [
    t('priceEstimatedRegional'),
    t(scopeKey, { count: observationCount, region }),
    lastObservedAt ? t('priceLastSeen', { date: lastObservedAt }) : '',
  ].filter(Boolean).join(' \u00b7 ');

  return (
    <span
      title={hint}
      className={cn(
        'shrink-0 whitespace-nowrap font-medium tabular-nums',
        price.estimate.confidence === 'low' ? 'text-muted-foreground' : 'text-foreground',
        className
      )}
    >
      {asRange
        ? `≈ ${formatMoney(low, currency, language)}–${formatMoney(high, currency, language)}`
        : `≈ ${formatMoney(value, currency, language)}`}
    </span>
  );
}

interface PriceTotalProps {
  total: { value: number; low: number; high: number; currency: string; priced: number; of: number } | null;
  label: string;
  className?: string;
  loading?: boolean;
}

/**
 * A summed cost — one meal, a day, or a whole shopping list.
 *
 * Always a range, and always says how many of the ingredients it could
 * actually price, because a total over eight of twelve foods is a different
 * claim from a total over all twelve.
 */
export function PriceTotal({ total, label, className, loading = false }: PriceTotalProps) {
  const { t, language } = useTranslation();

  if (!total) {
    return (
      <div className={cn('rounded-lg border border-dashed p-3 text-center', className)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? t('priceLoading') : t('priceUnavailable')}
        </p>
      </div>
    );
  }

  const partial = total.priced < total.of;
  const showRange = total.high > total.low;

  return (
    <div className={cn('rounded-lg border bg-muted/40 p-3', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">
        {showRange
          ? `≈ ${formatMoney(total.low, total.currency, language)}–${formatMoney(total.high, total.currency, language)}`
          : `≈ ${formatMoney(total.value, total.currency, language)}`}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3 shrink-0" />
        {partial
          ? t('priceTotalPartial', { priced: total.priced, of: total.of })
          : t('priceTotalBasis')}
      </p>
    </div>
  );
}
