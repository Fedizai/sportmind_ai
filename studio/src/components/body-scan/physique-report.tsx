'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, Dumbbell, Droplets, Flame, Bone, Ruler } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import {
  MEASUREMENT_FIELDS,
  unitLabel,
  type MeasurementId,
  type MeasurementUnitSystem,
} from '@/lib/body-zones';
import {
  computeComposition,
  computePhysiqueScore,
  physiqueGrade,
} from '@/lib/body-composition';
import type { TranslationKey } from '@/lib/i18n';

interface PhysiqueReportProps {
  measurements: Partial<Record<MeasurementId, number>>;
  unitSystem: MeasurementUnitSystem;
  bodyFat: number;
  bodyFatRange: string;
}

const GRADE_KEY: Record<string, TranslationKey> = {
  top: 'physiqueElite',
  good: 'physiqueAdvanced',
  mid: 'physiqueDeveloping',
  low: 'physiqueFoundation',
};

function ScoreGauge({ score }: { score: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [shown, setShown] = useState(prefersReducedMotion ? score : 0);
  const r = 52;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    if (prefersReducedMotion) {
      setShown(score);
      return;
    }
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score, prefersReducedMotion]);

  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CompositionBar({
  icon,
  label,
  value,
  suffix,
  pct,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span style={{ color }}>{icon}</span>
          {label}
        </span>
        <span className="font-semibold">
          {value}
          {suffix && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, pct)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function PhysiqueReport({ measurements, unitSystem, bodyFat, bodyFatRange }: PhysiqueReportProps) {
  const { t } = useTranslation();
  const comp = computeComposition(measurements, bodyFat, unitSystem);
  const score = computePhysiqueScore(measurements, bodyFat);
  const grade = physiqueGrade(score);

  const enteredFields = MEASUREMENT_FIELDS.filter((f) => measurements[f.id] !== undefined);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* AI Physique Score */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {t('physiqueScoreTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-6">
          <ScoreGauge score={score} />
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {t(GRADE_KEY[grade.tone])}
          </span>
          <p className="text-center text-xs text-muted-foreground">{t('physiqueScoreHint')}</p>
        </CardContent>
      </Card>

      {/* Body Composition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-primary" />
            {t('bodyCompositionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CompositionBar
            icon={<Dumbbell className="h-4 w-4" />}
            label={t('compMuscle')}
            value={`${comp.musclePct}`}
            suffix="%"
            pct={comp.musclePct}
            color="hsl(var(--primary))"
          />
          <CompositionBar
            icon={<Flame className="h-4 w-4" />}
            label={t('compFat')}
            value={`${comp.fatPct}`}
            suffix={`% · ${bodyFatRange}`}
            pct={comp.fatPct}
            color="#f59e0b"
          />
          <CompositionBar
            icon={<Droplets className="h-4 w-4" />}
            label={t('compWater')}
            value={`${comp.waterPct}`}
            suffix="%"
            pct={comp.waterPct}
            color="#38bdf8"
          />
          <CompositionBar
            icon={<Bone className="h-4 w-4" />}
            label={t('compBone')}
            value={`${comp.bonePct}`}
            suffix="%"
            pct={comp.bonePct * 4}
            color="#a78bfa"
          />
          <div className="flex items-center justify-between border-t border-border/60 pt-3 dark:border-white/[0.07]">
            <span className="text-sm font-medium">{t('bmiLabel')}</span>
            <span className="text-sm font-bold">{comp.bmi ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ruler className="h-5 w-5 text-primary" />
            {t('measurementsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {enteredFields.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
              >
                <p className="text-xs text-muted-foreground">{t(f.labelKey)}</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {measurements[f.id]}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {unitLabel(f.kind, unitSystem)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
