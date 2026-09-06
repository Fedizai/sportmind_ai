'use client';

import { AlertTriangle } from 'lucide-react';

import { FIT_REGIONS, type FitRegion, type FitResult } from '@/lib/body-fit';
import { useLanguageStore } from '@/stores/language-store';
import { cn } from '@/lib/utils';

const S = {
    title: { en: 'What the avatar represents', fr: "Ce que l'avatar représente" },
    intro: {
        en: 'Your measurement against the body actually built from it.',
        fr: 'Ta mesure comparée au corps réellement construit à partir d\'elle.',
    },
    region: { en: 'Measurement', fr: 'Mesure' },
    asked: { en: 'You entered', fr: 'Tu as saisi' },
    shown: { en: 'Avatar', fr: 'Avatar' },
    chest: { en: 'Chest', fr: 'Poitrine' },
    waist: { en: 'Waist', fr: 'Taille' },
    hips: { en: 'Hips', fr: 'Hanches' },
    upperArm: { en: 'Upper arm', fr: 'Bras' },
    thigh: { en: 'Thigh', fr: 'Cuisse' },
    limit: { en: 'at this model’s limit', fr: 'limite du modèle' },
    abdomen: { en: 'Abdomen', fr: 'Abdomen' },
    abdomenNote: {
        en: 'built from seven abdominal morphs — width, depth, upper and lower belly, flanks, forward projection and overhang',
        fr: 'construit à partir de sept morphs abdominaux — largeur, profondeur, haut et bas du ventre, flancs, projection avant et tablier',
    },
    fromWeight: { en: 'from your weight', fr: 'd’après ton poids' },
    limitNote: {
        en: 'The model cannot reach the values marked above on this frame — the avatar shows the closest body it can build, not the number you entered.',
        fr: "Le modèle ne peut pas atteindre les valeurs marquées ci-dessus sur cette morphologie — l'avatar montre le corps le plus proche possible, pas le chiffre saisi.",
    },
} as const;

/** The stage names the abdomen program returns, in the athlete's language. */
const STAGE: Record<string, { en: string; fr: string }> = {
    flat: { en: 'flat', fr: 'plat' },
    full: { en: 'full', fr: 'marqué' },
    large: { en: 'large', fr: 'large' },
    'very large': { en: 'very large', fr: 'très large' },
    extreme: { en: 'extreme', fr: 'extrême' },
};

const LABEL: Record<FitRegion, keyof typeof S> = {
    chest: 'chest', waist: 'waist', hips: 'hips', upperArm: 'upperArm', thigh: 'thigh',
};

/**
 * Requested against represented, side by side.
 *
 * A fitter that silently clamps is indistinguishable from one that works: a
 * 150 cm waist would come back as an average body with no explanation. Showing
 * both numbers means the athlete can see for themselves whether the avatar is
 * theirs, and where it stops being able to be.
 */
export function FitReport({
    fit,
    requested,
    implied,
    className,
}: {
    fit: FitResult;
    /** Only the regions the athlete actually supplied are worth comparing. */
    requested: Partial<Record<FitRegion, number>>;
    /**
     * What height and weight imply for the regions no tape covered.
     *
     * Shown so a heavy build is not silently under-represented: entering 150 kg
     * and nothing else should still say what the avatar came out as against
     * what that weight actually implies.
     */
    implied?: Partial<Record<FitRegion, number>>;
    className?: string;
}) {
    const language = useLanguageStore((s) => s.language);
    const tr = (v: { en: string; fr: string }) => (language === 'fr' ? v.fr : v.en);

    const valueFor = (r: FitRegion) => {
        const typed = requested[r];
        if (typed !== undefined && Number.isFinite(typed) && typed > 0) return { value: typed, typed: true };
        const guess = implied?.[r];
        if (guess !== undefined && Number.isFinite(guess) && guess > 0) return { value: guess, typed: false };
        return null;
    };
    const rows = FIT_REGIONS.filter((r) => valueFor(r) !== null);
    if (!rows.length) return null;

    const anyLimited = rows.some((r) => fit.outOfRange.includes(r));

    return (
        <div className={cn('rounded-xl border border-border/60 p-3', className)}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tr(S.title)}
            </p>
            <p className="mb-2 text-xs text-muted-foreground">{tr(S.intro)}</p>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="pb-1 text-left font-medium">{tr(S.region)}</th>
                        <th className="pb-1 text-right font-medium">{tr(S.asked)}</th>
                        <th className="pb-1 text-right font-medium">{tr(S.shown)}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((region) => {
                        const source = valueFor(region)!;
                        const asked = source.value;
                        const shown = fit.predicted[region];
                                        // A weight-implied target the mesh cannot reach counts
                        // as limited too, even though the fitter was never
                        // asked for it directly.
                        const limited = fit.outOfRange.includes(region) || Math.abs(shown - asked) > 4;
                        const off = Math.abs(shown - asked);
                        return (
                            <tr key={region} className="border-t border-border/40">
                                <td className="py-1.5">
                                    {tr(S[LABEL[region]])}
                                    {!source.typed && (
                                        <span className="ml-1.5 text-[10px] text-muted-foreground">{tr(S.fromWeight)}</span>
                                    )}
                                </td>
                                <td className="py-1.5 text-right tabular-nums">{asked.toFixed(0)}</td>
                                <td className={cn(
                                    'py-1.5 text-right tabular-nums',
                                    limited || off > 1.5 ? 'font-semibold text-warning' : 'text-muted-foreground',
                                )}>
                                    {Number.isFinite(shown) ? shown.toFixed(0) : '—'}
                                    {limited && (
                                        <span className="ml-1 text-[10px] font-normal uppercase tracking-wide">
                                            {tr(S.limit)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {fit.belly > 0.25 && (
                <p className="mt-2 border-t border-border/40 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">
                        {tr(S.abdomen)}: {tr(STAGE[fit.bellyStage] ?? { en: fit.bellyStage, fr: fit.bellyStage })}
                    </span>
                    {' — '}
                    {tr(S.abdomenNote)}
                </p>
            )}

            {anyLimited && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    {tr(S.limitNote)}
                </p>
            )}
        </div>
    );
}
