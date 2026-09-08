'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';

import { BodyScan3D, type BodyScan3DLabels } from './body-scan-3d';
import { FitReport } from './fit-report';
import { fitBodyMeasurements, impliedCircumferences, FIT_REGIONS, type FitRegion } from '@/lib/body-fit';
import { toBodyMeasurements, modelSexFor } from '@/lib/body-fit/from-scan';
import type { BodyScan } from '@/hooks/use-body-scans';
import { MEASUREMENT_FIELDS, type MeasurementId, type MeasurementUnitSystem } from '@/lib/body-zones';
import { cn } from '@/lib/utils';

/** Which tape field feeds which fitted loop, for the side-by-side readout. */
const FIELD_FOR: Record<FitRegion, MeasurementId> = {
    chest: 'chest', waist: 'waist', hips: 'hips', upperArm: 'arms', thigh: 'thighs',
};

interface Props {
    scans: BodyScan[];
    /** The scan the whole page is reading, or null for the most recent one. */
    selectedId: string | null;
    onSelect: (id: string) => void;
    labels: BodyScan3DLabels;
    unitLabel: (kind: 'length' | 'mass', system: MeasurementUnitSystem) => string;
    t: (key: any, vars?: Record<string, string | number>) => string;
}

/**
 * Every scan the athlete has taken, one body at a time.
 *
 * Selecting another date does not reload the GLB — the fitted influences
 * change and the mesh eases from one body to the next, so a waist coming down
 * over three months reads as a single continuous change rather than a jump
 * between two unrelated pictures. Nothing is overwritten: each scan is its own
 * document and this only ever reads them.
 */
export function ScanProgressViewer({ scans, selectedId, onSelect, labels, unitLabel, t }: Props) {
    // Oldest first here, so "the previous scan" is the one to the left and the
    // deltas below read as change over time.
    const ordered = useMemo(
        () => scans.slice().reverse(),
        [scans],
    );
    /**
     * Which scan is on screen, decided by the page rather than kept here.
     *
     * This used to hold its own index, seeded once from the number of scans it
     * happened to be handed. A scan saved afterwards did not move it, so a
     * fresh analysis left the viewer sitting on the previous body — and the
     * Results tab and this one could disagree about which scan was "current".
     */
    const fromSelection = selectedId ? ordered.findIndex((s) => s.id === selectedId) : -1;
    const index = fromSelection >= 0 ? fromSelection : ordered.length - 1;
    const scan = ordered[index];

    const fit = useMemo(() => {
        if (!scan) return null;
        return fitBodyMeasurements({
            modelSex: modelSexFor(scan.sex),
            ...toBodyMeasurements(scan.measurements, scan.unitSystem),
        });
    }, [scan]);

    /** Change since the previous scan, so progress is visible without a chart. */
    const previous = index > 0 ? ordered[index - 1] : undefined;

    /** What the scan's height and weight imply where no tape was recorded. */
    const impliedFor = (s: BodyScan) => {
        const m = toBodyMeasurements(s.measurements, s.unitSystem);
        return m.weightKg && m.weightKg > 0
            ? impliedCircumferences(modelSexFor(s.sex), m.heightCm, m.weightKg)
            : undefined;
    };

    /** What this scan asked for, in cm, for the requested-vs-represented table. */
    const requestedFor = (s: BodyScan) => {
        const m = toBodyMeasurements(s.measurements, s.unitSystem);
        return { chest: m.chestCm, waist: m.waistCm, hips: m.hipsCm, upperArm: m.upperArmCm, thigh: m.thighCm };
    };

    if (!scan || !fit) return null;

    const when = scan.createdAt?.seconds
        ? format(new Date(scan.createdAt.seconds * 1000), 'd MMM yyyy')
        : '';

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
                <BodyScan3D
                    modelSex={modelSexFor(scan.sex)}
                    weights={fit.weights}
                    bodyHeightCm={fit.predicted.heightCm}
                    circumferences={fit.predicted}
                    scanDate={when}
                    labels={labels}
                    className="h-[460px] sm:h-[560px]"
                />
                <FitReport fit={fit} requested={requestedFor(scan)} implied={impliedFor(scan)} />
            </div>

            <div className="space-y-4">
                {/* The measurements sit beside the body rather than as twenty
                    labels floating over it. */}
                <div className="rounded-xl border border-border/60 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t('bodyScanMeasurements')}
                    </p>
                    <dl className="space-y-1.5 text-sm">
                        {MEASUREMENT_FIELDS.map((field) => {
                            const value = scan.measurements[field.id];
                            if (value === undefined) return null;
                            const before = previous?.measurements[field.id];
                            const delta = before === undefined ? undefined : value - before;
                            return (
                                <div key={field.id} className="flex items-baseline justify-between gap-2">
                                    <dt className="text-muted-foreground">{t(field.labelKey)}</dt>
                                    <dd className="flex items-baseline gap-1.5 tabular-nums">
                                        <span className="font-medium">
                                            {value} {unitLabel(field.kind, scan.unitSystem)}
                                        </span>
                                        {delta !== undefined && Math.abs(delta) >= 0.1 && (
                                            <span className={cn(
                                                'text-[11px] font-semibold',
                                                delta < 0 ? 'text-success' : 'text-warning',
                                            )}>
                                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                    {scan.estimated && (
                        <p className="mt-2 text-[11px] text-muted-foreground">{t('bodyScanEstimateNote')}</p>
                    )}
                </div>

                {/* Anything the mesh could not reach is said plainly rather
                    than shown as a body that quietly does not match. */}
                {fit.outOfRange.length > 0 && (
                    <p className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                        {t('bodyScanOutOfRange', {
                            fields: fit.outOfRange
                                .map((r) => t(MEASUREMENT_FIELDS.find((f) => f.id === FIELD_FOR[r])!.labelKey))
                                .join(', '),
                        })}
                    </p>
                )}

                {ordered.length > 0 && (
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {t('bodyScanHistory')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {ordered.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => onSelect(s.id)}
                                    className={cn(
                                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                        i === index
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border/60 text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {s.createdAt?.seconds
                                        ? format(new Date(s.createdAt.seconds * 1000), 'd MMM')
                                        : `#${i + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
