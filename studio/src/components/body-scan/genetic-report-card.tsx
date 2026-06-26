"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BodyMesh, MeasurementLeaders, type LeaderEntry, type ScanView } from "./body-wireframe";
import type { BodyZoneId } from "@/lib/body-zones";

const CARD_W = 360;
const CARD_H = 620;

interface GeneticReportCardProps {
  view: ScanView;
  zoneScores?: { zone: BodyZoneId; score: number }[];
  leaders: LeaderEntry[];
  scanDate: string;
  bodyFat?: number;
  bodyFatRange?: string;
  labels: {
    title: string; // "GENETIC REPORT"
    scanDate: string; // "SCAN DATE"
    bodyFat: string; // "BODY FAT"
    exportReport: string;
    strong: string;
    average: string;
    weak: string;
  };
}

/** Resolve `hsl(var(--primary))` to a concrete color so exported PNGs keep it. */
function useResolvedPrimary() {
  const [color, setColor] = useState("#3b82f6");
  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.color = "hsl(var(--primary))";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    if (resolved) setColor(resolved);
  }, []);
  return color;
}

export function GeneticReportCard({
  view,
  zoneScores,
  leaders,
  scanDate,
  bodyFat,
  bodyFatRange,
  labels,
}: GeneticReportCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const primary = useResolvedPrimary();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    setExporting(true);
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("render failed"));
        img.src = `data:image/svg+xml;base64,${svg64}`;
      });
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * scale;
      canvas.height = CARD_H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `genetic-report-${scanDate}.png`;
      a.click();
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const ink = "#e8edf7";
  const muted = "#7c8aa5";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        width={CARD_W}
        height={CARD_H}
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        className="w-full max-w-[360px] rounded-2xl shadow-float"
        role="img"
        aria-label="Genetic report card"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* dark artifact background */}
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="20" fill="#070b16" />
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="20" fill="none" stroke={primary} strokeOpacity="0.25" />

        {/* faint backdrop grid */}
        <g stroke={primary} strokeOpacity="0.06" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 36} y1="0" x2={(i + 1) * 36} y2={CARD_H} />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={(i + 1) * 38} x2={CARD_W} y2={(i + 1) * 38} />
          ))}
        </g>

        {/* header */}
        <text x="22" y="34" fontSize="14" fontWeight="700" letterSpacing="0.12em" fill={primary}>
          {labels.title}
        </text>
        <text x={CARD_W - 22} y="26" fontSize="8" letterSpacing="0.1em" textAnchor="end" fill={muted}>
          {labels.scanDate}
        </text>
        <text x={CARD_W - 22} y="38" fontSize="11" fontWeight="700" textAnchor="end" fill={ink}>
          {scanDate}
        </text>
        <line x1="22" y1="48" x2={CARD_W - 22} y2="48" stroke={primary} strokeOpacity="0.2" />

        {/* body mesh + leaders, scaled to fit */}
        <g transform="translate(36, 50) scale(0.96)">
          <BodyMesh idPrefix="report" view={view} zoneScores={zoneScores} animate={false} color={primary} />
          <MeasurementLeaders entries={leaders} color={primary} />
        </g>

        {/* footer: body fat + legend */}
        <line x1="22" y1={CARD_H - 78} x2={CARD_W - 22} y2={CARD_H - 78} stroke={primary} strokeOpacity="0.2" />
        {bodyFat !== undefined && (
          <>
            <text x="22" y={CARD_H - 56} fontSize="8" letterSpacing="0.1em" fill={muted}>
              {labels.bodyFat}
            </text>
            <text x="22" y={CARD_H - 32} fontSize="26" fontWeight="800" fill={ink}>
              {bodyFat.toFixed(1)}%
            </text>
            {bodyFatRange && (
              <text x="22" y={CARD_H - 16} fontSize="9" fill={muted}>
                {bodyFatRange}
              </text>
            )}
          </>
        )}

        {/* status legend */}
        <g transform={`translate(${CARD_W - 150}, ${CARD_H - 62})`} fontSize="9" fill={muted}>
          <circle cx="4" cy="0" r="4" fill="#22c55e" />
          <text x="14" y="3">{labels.strong}</text>
          <circle cx="4" cy="18" r="4" fill="#eab308" />
          <text x="14" y="21">{labels.average}</text>
          <circle cx="4" cy="36" r="4" fill="#f43f5e" />
          <text x="14" y="39">{labels.weak}</text>
        </g>

        <text x={CARD_W - 22} y={CARD_H - 14} fontSize="8.5" textAnchor="end" letterSpacing="0.08em" fill={primary} opacity="0.8">
          SportMind AI
        </text>
      </svg>

      <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
        <Download className="mr-2 h-4 w-4" />
        {labels.exportReport}
      </Button>
    </div>
  );
}
