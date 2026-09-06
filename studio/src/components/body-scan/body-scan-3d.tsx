'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ScanLine, Move3d, Loader2, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ZoneScore } from '@/lib/body-zones';
import type { ScanView3D } from './three/glb-scene';
import type { FitRegion, ModelSex, MorphWeights } from '@/lib/body-fit';
import { usePrimaryColor } from './three/use-primary-color';

const Scene = dynamic(() => import('./three/glb-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
    </div>
  ),
});

export interface BodyScan3DLabels {
  title: string;
  front: string;
  side: string;
  back: string;
  hint: string;
  reset?: string;
}

interface BodyScan3DProps {
  /** kept for API compatibility; the rings are drawn in the 3D scene now */
  rings?: unknown[];
  /** accepted for API compatibility; muscle zones are shown in the report panel */
  zoneScores?: ZoneScore[];
  /** Which shared GLB to fit — one male mesh and one female mesh, never a per-user file. */
  modelSex: ModelSex;
  /** Fitted morph influences, 0..1, at most one of each opposing pair. */
  weights: MorphWeights;
  /** Fitted stature, so framing and rings follow the body's size. */
  bodyHeightCm?: number;
  /** Fitted circumferences, so each ring is sized to the body it measures. */
  circumferences?: Partial<Record<FitRegion, number>>;
  scanDate?: string;
  labels: BodyScan3DLabels;
  defaultView?: ScanView3D;
  className?: string;
}

const VIEWS: ScanView3D[] = ['front', 'side', 'back'];

export function BodyScan3D({
  modelSex, weights, bodyHeightCm, circumferences, scanDate, labels,
  defaultView = 'front', className,
}: BodyScan3DProps) {
  const [view, setView] = useState<ScanView3D>(defaultView);
  const [resetToken, setResetToken] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const animate = !prefersReducedMotion;
  const primary = usePrimaryColor();
  const primarySoft = primary.replace('rgb(', 'rgba(').replace(')', ', 0.22)');

  const viewLabel: Record<ScanView3D, string> = {
    front: labels.front,
    side: labels.side,
    back: labels.back,
  };

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-primary/15 bg-[#04070d] shadow-float',
        className
      )}
      style={{ minHeight: 420 }}
    >
      {/* holographic backdrop glow, tinted with the brand colour */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 50% 16%, ${primarySoft} 0%, rgba(4,7,13,0) 64%)` }}
      />

      {/* corner scanner brackets */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <span
          key={c}
          aria-hidden
          className={cn(
            'pointer-events-none absolute z-10 h-5 w-5 border-primary/40',
            c === 'tl' && 'left-3 top-3 border-l border-t rounded-tl-md',
            c === 'tr' && 'right-3 top-3 border-r border-t rounded-tr-md',
            c === 'bl' && 'bottom-3 left-3 border-b border-l rounded-bl-md',
            c === 'br' && 'bottom-3 right-3 border-b border-r rounded-br-md'
          )}
        />
      ))}

      {/* header */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ScanLine className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
            {labels.title}
          </span>
        </div>
        {scanDate && (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/60">{scanDate}</span>
        )}
      </div>

      {/* 3D canvas */}
      <div className="absolute inset-0">
        <Scene
          modelSex={modelSex}
          weights={weights}
          view={view}
          color={primary}
          animate={animate}
          bodyHeightCm={bodyHeightCm}
          circumferences={circumferences}
          resetToken={resetToken}
        />
      </div>

      {/* drag hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center">
        <span className="flex items-center gap-1.5 rounded-md bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/55 backdrop-blur-sm">
          <Move3d className="h-3 w-3" />
          {labels.hint}
        </span>
      </div>

      {/* view toggle */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
        <div className="flex gap-1 rounded-lg border border-primary/20 bg-black/40 p-1 backdrop-blur-md">
          {VIEWS.map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'relative rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                  active ? 'text-primary-foreground' : 'text-white/60 hover:text-white'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bodyscan-view-pill"
                    className="absolute inset-0 -z-10 rounded-md bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {viewLabel[v]}
              </button>
            );
          })}
          <span aria-hidden className="mx-0.5 my-1 w-px bg-primary/20" />
          <button
            type="button"
            onClick={() => setResetToken((n) => n + 1)}
            title={labels.reset ?? 'Reset view'}
            aria-label={labels.reset ?? 'Reset view'}
            className="rounded-md px-2.5 py-1.5 text-white/60 transition-colors hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
