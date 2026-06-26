"use client";

import { useMemo } from "react";
import {
  BODY_SHAPES,
  BODY_VIEWBOX,
  BACK_DETAIL_LINES,
  ZONES,
  triangleLattice,
  zoneColor,
  type BodyShape,
  type BodyZoneId,
  type MeasurementAnchor,
} from "@/lib/body-zones";

const PRIMARY = "hsl(var(--primary))";

export type ScanView = "front" | "back";

export interface LeaderEntry {
  key: string;
  partLabel: string;
  valueText: string;
  anchor: MeasurementAnchor;
}

function shapeToClip(shape: BodyShape, i: number) {
  if (shape.type === "circle") {
    return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />;
  }
  return <polygon key={i} points={shape.points} />;
}

function shapeToOutline(shape: BodyShape, i: number) {
  if (shape.type === "circle") {
    return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />;
  }
  return <polygon key={i} points={shape.points} />;
}

/**
 * The reusable mesh body as a self-contained `<g>` (carries its own defs), so
 * it can be dropped into any parent `<svg>` — the live wireframe and the
 * exportable report card both use it.
 */
export function BodyMesh({
  idPrefix,
  view,
  zoneScores,
  animate = true,
  color = PRIMARY,
}: {
  idPrefix: string;
  view: ScanView;
  zoneScores?: { zone: BodyZoneId; score: number }[];
  animate?: boolean;
  color?: string;
}) {
  const clipId = `bodyclip-${idPrefix}`;
  const glowId = `bodyglow-${idPrefix}`;
  const lattice = useMemo(() => triangleLattice(18), []);
  const scoreMap = useMemo(() => {
    const m = new Map<BodyZoneId, number>();
    zoneScores?.forEach((z) => m.set(z.zone, z.score));
    return m;
  }, [zoneScores]);

  const visibleZones = ZONES.filter((z) => z.view === "both" || z.view === view);

  return (
    <g>
      <defs>
        <clipPath id={clipId}>{BODY_SHAPES.map(shapeToClip)}</clipPath>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes bodyScanMove-${idPrefix} {
            0% { transform: translateY(10px); opacity: 0; }
            12% { opacity: 0.5; }
            88% { opacity: 0.5; }
            100% { transform: translateY(520px); opacity: 0; }
          }
          .scanline-${idPrefix} { animation: bodyScanMove-${idPrefix} 3.4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .scanline-${idPrefix} { animation: none; opacity: 0; }
          }
        `}</style>
      </defs>

      {/* clipped interior: faint fill, zone tints, lattice, scan line */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width={BODY_VIEWBOX.w} height={BODY_VIEWBOX.h} fill={color} opacity={0.06} />

        {zoneScores &&
          visibleZones.map((zone) => {
            const score = scoreMap.get(zone.id);
            if (score === undefined) return null;
            return zone.blobs.map((b, bi) => (
              <ellipse
                key={`${zone.id}-${bi}`}
                cx={b.cx}
                cy={b.cy}
                rx={b.rx}
                ry={b.ry}
                fill={zoneColor(score)}
                opacity={0.3}
              />
            ));
          })}

        <g stroke={color} strokeWidth={0.6} strokeOpacity={0.28}>
          {lattice.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>

        {view === "back" && (
          <g stroke={color} strokeWidth={1} strokeOpacity={0.5}>
            {BACK_DETAIL_LINES.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        )}

        {animate && (
          <rect
            className={`scanline-${idPrefix}`}
            x="0"
            y="0"
            width={BODY_VIEWBOX.w}
            height="8"
            fill={color}
            opacity={0}
          />
        )}
      </g>

      {/* bright glowing outline */}
      <g fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" opacity={0.92} filter={`url(#${glowId})`}>
        {BODY_SHAPES.map(shapeToOutline)}
      </g>

      {/* vertex nodes for a hint of "scan points" */}
      <g fill={color} opacity={0.8}>
        {visibleZones.flatMap((z) =>
          z.blobs.map((b, bi) => <circle key={`${z.id}-node-${bi}`} cx={b.cx} cy={b.cy} r={1.6} />)
        )}
      </g>
    </g>
  );
}

/** Measurement leader-lines + labels, drawn over the mesh (front view). */
export function MeasurementLeaders({ entries, color = PRIMARY }: { entries: LeaderEntry[]; color?: string }) {
  return (
    <g>
      {entries.map(({ key, partLabel, valueText, anchor }) => {
        const left = anchor.side === "left";
        const elbowX = left ? 46 : 254;
        const textX = left ? 8 : 292;
        const textAnchor = left ? "start" : "end";
        return (
          <g key={key}>
            <polyline
              points={`${anchor.x},${anchor.y} ${elbowX},${anchor.y}`}
              fill="none"
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.7}
            />
            <circle cx={anchor.x} cy={anchor.y} r={2.4} fill={color} />
            <text
              x={textX}
              y={anchor.y - 3}
              textAnchor={textAnchor}
              fontSize={7.5}
              letterSpacing="0.08em"
              fill={color}
              opacity={0.7}
              style={{ textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}
            >
              {partLabel}
            </text>
            <text
              x={textX}
              y={anchor.y + 9}
              textAnchor={textAnchor}
              fontSize={12}
              fontWeight={700}
              fill={color}
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {valueText}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Full interactive wireframe used in the live Results view. */
export function BodyWireframe({
  view,
  zoneScores,
  leaders,
  idPrefix = "live",
  className,
}: {
  view: ScanView;
  zoneScores?: { zone: BodyZoneId; score: number }[];
  leaders?: LeaderEntry[];
  idPrefix?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${BODY_VIEWBOX.w} ${BODY_VIEWBOX.h}`}
      className={className}
      role="img"
      aria-label="Body composition wireframe"
    >
      <BodyMesh idPrefix={idPrefix} view={view} zoneScores={zoneScores} />
      {leaders && leaders.length > 0 && <MeasurementLeaders entries={leaders} />}
    </svg>
  );
}
