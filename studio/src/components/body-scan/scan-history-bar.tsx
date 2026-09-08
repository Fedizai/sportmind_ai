'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { ScanLine, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { BodyScan } from '@/hooks/use-body-scans';
import type { TranslationKey } from '@/lib/i18n';

type TFn = (k: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Every analysis the athlete has ever run, as one row of dates.
 *
 * The Results tab used to render `latest` and nothing else, so an earlier scan
 * existed in Firestore but had nowhere to be read — the report, the zone
 * scores and the recommendations from it were simply unreachable. Each entry
 * here opens that scan's own report; none of them is a summary of another.
 */
export function ScanHistoryBar({
  t,
  locale,
  scans,
  selectedId,
  onSelect,
  onReuse,
  onDelete,
  onNewScan,
}: {
  t: TFn;
  locale: Locale;
  scans: BodyScan[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReuse: () => void;
  /** Removes the selected scan for good. Confirmed here first. */
  onDelete: () => void;
  onNewScan: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  /**
   * A date, and the time too when another scan shares that day.
   *
   * Two analyses run the same afternoon both read "8 sept. 2026", which is no
   * help at all on the button that deletes one of them for good. The time only
   * appears where it is needed to tell them apart.
   */
  const perDay = new Map<string, number>();
  for (const s of scans) {
    if (!s.createdAt) continue;
    const day = format(s.createdAt.toDate(), 'yyyy-MM-dd');
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const labelFor = (s: BodyScan) => {
    if (!s.createdAt) return t('bodyScanLatestScan');
    const when = s.createdAt.toDate();
    const shared = (perDay.get(format(when, 'yyyy-MM-dd')) ?? 0) > 1;
    return format(when, shared ? "d MMM yyyy, HH'h'mm" : 'd MMM yyyy', { locale });
  };

  const selected = scans.find((s) => s.id === selectedId);
  const selectedWhen = selected ? labelFor(selected) : t('bodyScanLatestScan');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("bodyScanHistory")}
          </span>
          <span className="text-xs text-muted-foreground">
            {scans.length === 1
              ? t("bodyScanHistoryCountOne")
              : t("bodyScanHistoryCount", { count: scans.length })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
          </Button>
          <Button variant="outline" size="sm" onClick={onReuse}>
            {t("bodyScanReuseMeasurements")}
          </Button>
          <Button size="sm" onClick={onNewScan}>
            <ScanLine className="mr-2 h-4 w-4" />
            {t("bodyScanTabScan")}
          </Button>
        </div>
      </div>

      {/* Scrolls on its own rather than pushing the page sideways. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-2">
          {scans.map((scan, i) => {
            const isSelected = scan.id === selectedId;
            const when = labelFor(scan);
            return (
              <button
                key={scan.id}
                type="button"
                onClick={() => onSelect(scan.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex shrink-0 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 dark:border-white/[0.07] text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="text-xs font-semibold">{when}</span>
                <span className="text-[11px] tabular-nums opacity-80">
                  {scan.analysis ? `${scan.analysis.bodyFatEstimate}%` : "—"}
                  {i === 0 && ` · ${t("bodyScanLatestScan")}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deleting a scan cannot be undone, so it is asked for once, plainly,
          and the date says which one is about to go. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bodyScanDeleteScan")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bodyScanConfirmDelete", { date: selectedWhen })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
