'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguageStore } from '@/stores/language-store';
import { cn } from '@/lib/utils';
import { FIT_REGIONS, type FitRegion } from '@/lib/body-fit';
import type { MeasurementSource, PhotoMeasurementSuccess } from '@/lib/body-photo/types';

const S = {
    title: { en: 'Check your measurements', fr: 'Vérifie tes mesures' },
    intro: {
        en: 'These are estimated from your photos. Correct anything that looks wrong — your correction is what gets saved.',
        fr: 'Ces valeurs sont estimées à partir de tes photos. Corrige ce qui te semble faux — c\'est ta correction qui sera enregistrée.',
    },
    chest: { en: 'Chest', fr: 'Poitrine' },
    waist: { en: 'Waist', fr: 'Taille' },
    hips: { en: 'Hips', fr: 'Hanches' },
    upperArm: { en: 'Upper arm', fr: 'Bras' },
    thigh: { en: 'Thigh', fr: 'Cuisse' },
    confidence: { en: 'Confidence', fr: 'Confiance' },
    overall: { en: 'Overall confidence', fr: 'Confiance globale' },
    low: { en: 'Low — worth measuring this one with a tape', fr: 'Faible — mieux vaut la mesurer au mètre' },
    medium: { en: 'Medium', fr: 'Moyenne' },
    high: { en: 'High', fr: 'Élevée' },
    edited: { en: 'edited', fr: 'modifié' },
    confirm: { en: 'Confirm and build my body', fr: 'Confirmer et générer mon corps' },
    back: { en: 'Back', fr: 'Retour' },
    lowNotice: {
        en: 'An estimate from two photographs is not a tape measure. Anything marked low confidence is worth checking by hand.',
        fr: 'Une estimation à partir de deux photos ne remplace pas un mètre ruban. Vérifie à la main ce qui est marqué en confiance faible.',
    },
} as const;

const LABEL: Record<FitRegion, keyof typeof S> = {
    chest: 'chest', waist: 'waist', hips: 'hips', upperArm: 'upperArm', thigh: 'thigh',
};

function ConfidenceBadge({ value, tr }: { value: number; tr: (v: { en: string; fr: string }) => string }) {
    const level = value >= 0.75 ? 'high' : value >= 0.5 ? 'medium' : 'low';
    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                level === 'high' && 'bg-success/15 text-success',
                level === 'medium' && 'bg-warning/15 text-warning',
                level === 'low' && 'bg-destructive/15 text-destructive',
            )}
            title={tr(S[level])}
        >
            {Math.round(value * 100)}%
        </span>
    );
}

export interface ReviewedMeasurements {
    /** cm, after any correction the athlete made. */
    values: Record<FitRegion, number>;
    /** Per measurement: photo_estimated unless the athlete changed it. */
    sources: Record<FitRegion, MeasurementSource>;
    confidence: Record<FitRegion, number>;
    overallConfidence: number;
}

interface Props {
    estimate: PhotoMeasurementSuccess;
    onConfirm: (reviewed: ReviewedMeasurements) => void;
    onBack: () => void;
}

/**
 * Nothing is stored without the athlete seeing it first.
 *
 * Every field is editable, and editing one changes its provenance from
 * `photo_estimated` to `user_corrected` — so a number that came from a tape is
 * never later mistaken for one the pipeline produced, in the record or in the
 * validation harness.
 */
export function MeasurementReview({ estimate, onConfirm, onBack }: Props) {
    const language = useLanguageStore((s) => s.language);
    const tr = (v: { en: string; fr: string }) => (language === 'fr' ? v.fr : v.en);

    const initial = useMemo(
        () => Object.fromEntries(
            FIT_REGIONS.map((r) => [r, Math.round(estimate.regions[r].valueCm * 10) / 10]),
        ) as Record<FitRegion, number>,
        [estimate],
    );
    const [values, setValues] = useState<Record<FitRegion, number>>(initial);

    const edited = (r: FitRegion) => Math.abs(values[r] - initial[r]) > 0.05;

    const submit = () => {
        const sources = Object.fromEntries(
            FIT_REGIONS.map((r) => [r, edited(r) ? 'user_corrected' : 'photo_estimated']),
        ) as Record<FitRegion, MeasurementSource>;
        const confidence = Object.fromEntries(
            // A corrected value is the athlete's own measurement, so it no
            // longer carries the estimator's uncertainty.
            FIT_REGIONS.map((r) => [r, edited(r) ? 1 : estimate.regions[r].confidence]),
        ) as Record<FitRegion, number>;
        onConfirm({
            values,
            sources,
            confidence,
            overallConfidence: FIT_REGIONS.reduce((s, r) => s + confidence[r], 0) / FIT_REGIONS.length,
        });
    };

    const anyLow = FIT_REGIONS.some((r) => !edited(r) && estimate.regions[r].confidence < 0.5);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-bold">{tr(S.title)}</h3>
                <p className="text-sm text-muted-foreground">{tr(S.intro)}</p>
            </div>

            <div className="space-y-2.5">
                {FIT_REGIONS.map((region) => (
                    <div key={region} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                        <Label htmlFor={`m-${region}`} className="flex-1 text-sm">
                            {tr(S[LABEL[region]])}
                            {edited(region) && (
                                <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                                    <Pencil className="h-2.5 w-2.5" />{tr(S.edited)}
                                </span>
                            )}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id={`m-${region}`}
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                min={10}
                                max={250}
                                value={Number.isFinite(values[region]) ? values[region] : ''}
                                onChange={(e) => setValues((v) => ({ ...v, [region]: Number(e.target.value) }))}
                                className="w-24 text-right tabular-nums"
                            />
                            <span className="w-6 text-xs text-muted-foreground">cm</span>
                            <ConfidenceBadge value={edited(region) ? 1 : estimate.regions[region].confidence} tr={tr} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{tr(S.overall)}</span>
                <ConfidenceBadge value={estimate.overallConfidence} tr={tr} />
            </div>

            {anyLow && (
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    {tr(S.lowNotice)}
                </p>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onBack}>{tr(S.back)}</Button>
                <Button
                    onClick={submit}
                    disabled={FIT_REGIONS.some((r) => !(values[r] > 0))}
                >
                    <Check className="mr-2 h-4 w-4" />{tr(S.confirm)}
                </Button>
            </div>
        </div>
    );
}
