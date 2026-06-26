"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  ScanLine,
  Lock,
  Sparkles,
  Upload,
  Loader2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Dumbbell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeProModal } from "@/components/upgrade-pro-modal";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useBodyScans } from "@/hooks/use-body-scans";
import { analyzeBody } from "@/ai/flows/body-analysis-flow";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";
import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_ANCHORS,
  ZONES,
  unitLabel,
  zoneColor,
  zoneStatusKey,
  type MeasurementId,
  type Measurements,
  type MeasurementUnitSystem,
} from "@/lib/body-zones";
import { BodyWireframe, type LeaderEntry, type ScanView } from "@/components/body-scan/body-wireframe";
import { GeneticReportCard } from "@/components/body-scan/genetic-report-card";
import { BodyScan3D, type BodyScan3DLabels } from "@/components/body-scan/body-scan-3d";
import { PhysiqueReport } from "@/components/body-scan/physique-report";
import { BODY_RINGS } from "@/components/body-scan/three/human-landmarks";
import type { RingDatum } from "@/components/body-scan/three/measure-rings";
import type { ZoneScore } from "@/components/body-scan/three/body-model";
import type { BodyMorph } from "@/components/body-scan/three/human-geometry";

type TFn = (k: TranslationKey) => string;

function ringLabel(id: RingDatum["id"], t: TFn): string {
  switch (id) {
    case "shoulders":
      return t("zoneShoulders");
    case "chest":
      return t("zoneChest");
    case "waist":
      return t("measureWaist");
    case "hips":
      return t("measureHips");
    default:
      return id;
  }
}

/** Builds the holographic measuring bands from whatever measurements exist. */
function buildRings(
  values: Partial<Record<MeasurementId, number>>,
  system: MeasurementUnitSystem,
  t: TFn
): RingDatum[] {
  const out: RingDatum[] = [];
  for (const ring of BODY_RINGS) {
    const v = values[ring.source];
    if (v === undefined || Number.isNaN(v) || v <= 0) continue;
    out.push({
      id: ring.id,
      label: ringLabel(ring.id, t),
      valueText: `${v} ${unitLabel("length", system)}`,
      y: ring.y,
      radiusX: ring.radiusX,
      radiusZ: ring.radiusZ,
      side: ring.side,
    });
  }
  return out;
}

/** Reshape the holographic body toward the athlete's entered proportions. */
function deriveMorph(
  values: Partial<Record<MeasurementId, number>>,
  system: MeasurementUnitSystem
): BodyMorph {
  const toCm = (v?: number) => (v === undefined ? undefined : system === "imperial" ? v * 2.54 : v);
  const clamp = (n: number) => Math.max(0.72, Math.min(1.4, n));
  const ratio = (v: number | undefined, base: number) => (v === undefined ? 1 : clamp(v / base));
  const chest = toCm(values.chest);
  return {
    shoulders: ratio(chest, 104),
    chest: ratio(chest, 102),
    waist: ratio(toCm(values.waist), 85),
    hips: ratio(toCm(values.hips), 99),
    arms: ratio(toCm(values.arms), 35),
    legs: ratio(toCm(values.thighs), 56),
  };
}

function scan3dLabels(t: TFn): BodyScan3DLabels {
  return {
    title: t("geneticReport").toUpperCase(),
    front: t("frontView"),
    side: t("sideView"),
    back: t("backView"),
    hint: t("bodyScanDragHint"),
  };
}

const SPORT_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: "general", labelKey: "general" },
  { value: "gym", labelKey: "gym" },
  { value: "football", labelKey: "football" },
  { value: "tennis", labelKey: "tennis" },
];

const emptyForm: Record<MeasurementId, string> = {
  height: "",
  weight: "",
  chest: "",
  waist: "",
  hips: "",
  arms: "",
  thighs: "",
};

type Tab = "scan" | "results" | "progress";

export function BodyScanClient() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { user } = useUser();
  const { toast } = useToast();
  const isPro = user?.plan === "pro";
  const unitSystem: MeasurementUnitSystem = user?.preferences?.units === "imperial" ? "imperial" : "metric";

  const { scans, latest, addScan } = useBodyScans(user?.uid);

  const [tab, setTab] = useState<Tab>("scan");
  const [inputMode, setInputMode] = useState<"measurements" | "photos">("measurements");
  const [form, setForm] = useState<Record<MeasurementId, string>>(emptyForm);
  const [sport, setSport] = useState("general");
  const [frontPhoto, setFrontPhoto] = useState<string | undefined>();
  const [sidePhoto, setSidePhoto] = useState<string | undefined>();
  const [view, setView] = useState<ScanView>("front");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const setField = (id: MeasurementId, value: string) => setForm((f) => ({ ...f, [id]: value }));

  const readPhoto = (file: File | null, set: (uri?: string) => void) => {
    if (!file) {
      set(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!user) return;

    // Collect whatever measurements are filled in.
    const parsed: Partial<Record<MeasurementId, number>> = {};
    for (const field of MEASUREMENT_FIELDS) {
      const num = parseFloat(form[field.id]);
      if (!isNaN(num) && num > 0) parsed[field.id] = num;
    }
    const hasAllMeasurements = MEASUREMENT_FIELDS.every((f) => parsed[f.id] !== undefined);
    const hasPhoto = Boolean(frontPhoto || sidePhoto);

    // Either path is valid: full measurements OR at least one photo.
    if (inputMode === "measurements" && !hasAllMeasurements && !hasPhoto) {
      toast({ variant: "destructive", title: t("bodyScanIncomplete") });
      return;
    }
    if (inputMode === "photos" && !hasPhoto && !hasAllMeasurements) {
      toast({ variant: "destructive", title: t("bodyScanNeedInput") });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeBody({
        userId: user.uid,
        unitSystem,
        sport,
        measurements: parsed,
        frontPhotoUri: frontPhoto,
        sidePhotoUri: sidePhoto,
      });
      await addScan({ unitSystem, sport, measurements: parsed, analysis });
      toast({ title: t("bodyScanSaved") });
      setTab("results");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: t("bodyScanError") });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const leaders = useMemo<LeaderEntry[]>(() => {
    if (!latest) return [];
    const out: LeaderEntry[] = [];
    for (const field of MEASUREMENT_FIELDS) {
      if (!field.onBody) continue;
      const anchor = MEASUREMENT_ANCHORS[field.id];
      if (!anchor) continue;
      const value = latest.measurements[field.id];
      if (value === undefined) continue;
      out.push({
        key: field.id,
        partLabel: t(field.labelKey),
        valueText: `${value} ${unitLabel(field.kind, latest.unitSystem)}`,
        anchor,
      });
    }
    return out;
  }, [latest, t]);

  const parsedForm = useMemo<Partial<Record<MeasurementId, number>>>(() => {
    const out: Partial<Record<MeasurementId, number>> = {};
    (Object.keys(form) as MeasurementId[]).forEach((k) => {
      const n = parseFloat(form[k]);
      if (!Number.isNaN(n) && n > 0) out[k] = n;
    });
    return out;
  }, [form]);

  const liveRings = useMemo(() => buildRings(parsedForm, unitSystem, t), [parsedForm, unitSystem, t]);
  const liveMorph = useMemo(() => deriveMorph(parsedForm, unitSystem), [parsedForm, unitSystem]);
  const scanLabels = useMemo(() => scan3dLabels(t), [t]);

  const progressData = useMemo(() => {
    return scans
      .filter((s) => s.analysis)
      .slice()
      .reverse()
      .map((s) => ({
        date: s.createdAt ? format(s.createdAt.toDate(), "d MMM", { locale }) : "—",
        bodyFat: s.analysis!.bodyFatEstimate,
      }));
  }, [scans, locale]);

  /* ---------------------------- locked (non-pro) --------------------------- */
  if (!isPro) {
    return (
      <div className="space-y-6">
        <BackLink label={t("backToDashboard")} />
        <Header t={t} />
        <Card className="overflow-hidden">
          <CardContent className="grid gap-8 p-8 md:grid-cols-2 md:items-center">
            <div className="relative mx-auto w-full max-w-[260px]">
              <div className="pointer-events-none opacity-60 blur-[1px]">
                <BodyWireframe view="front" idPrefix="locked" className="w-full" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm shadow-float">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-4 text-center md:text-left">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Pro
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight font-headline">{t("bodyScanLockedTitle")}</h2>
              <p className="text-muted-foreground">{t("bodyScanLockedDesc")}</p>
              <Button onClick={() => setUpgradeOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("upgradeToPro")}
              </Button>
            </div>
          </CardContent>
        </Card>
        <UpgradeProModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </div>
    );
  }

  /* -------------------------------- main UI -------------------------------- */
  return (
    <div className="space-y-6">
      <BackLink label={t("backToDashboard")} />
      <Header t={t} />

      {/* lightweight tab bar */}
      <div className="inline-flex rounded-xl border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1 shadow-card">
        {(["scan", "results", "progress"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
              tab === tb
                ? "bg-background dark:bg-white/[0.09] text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tb === "scan" ? "bodyScanTabScan" : tb === "results" ? "bodyScanTabResults" : "bodyScanTabProgress")}
          </button>
        ))}
      </div>

      {tab === "scan" && (
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <BodyScan3D
            rings={liveRings}
            morph={liveMorph}
            labels={scanLabels}
            className="h-[480px] sm:h-[560px] lg:h-auto lg:min-h-[600px]"
          />
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>{t("bodyScanMeasurements")}</CardTitle>
                <CardDescription>{t("bodyScanInputChoiceHint")}</CardDescription>
              </div>
              <div className="inline-flex w-full rounded-xl border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1">
                {(["measurements", "photos"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInputMode(m)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                      inputMode === m
                        ? "bg-background dark:bg-white/[0.09] text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(m === "measurements" ? "bodyScanMeasurements" : "bodyScanPhotos")}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("bodyScanMeasurements")}</Label>
                {inputMode === "photos" && (
                  <span className="text-xs text-muted-foreground">{t("bodyScanOptional")}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {MEASUREMENT_FIELDS.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t(field.labelKey)}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={form[field.id]}
                        onChange={(e) => setField(field.id, e.target.value)}
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {unitLabel(field.kind, unitSystem)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("bodyScanSport")}</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(o.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("bodyScanPhotos")}</Label>
                  {inputMode === "measurements" && (
                    <span className="text-xs text-muted-foreground">{t("bodyScanOptional")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t("bodyScanPhotosHint")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <PhotoInput
                    label={t("bodyScanFrontPhoto")}
                    preview={frontPhoto}
                    onChange={(file) => readPhoto(file, setFrontPhoto)}
                  />
                  <PhotoInput
                    label={t("bodyScanSidePhoto")}
                    preview={sidePhoto}
                    onChange={(file) => readPhoto(file, setSidePhoto)}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("bodyScanAnalyzing")}
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-2 h-4 w-4" />
                    {t("bodyScanAnalyze")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "results" &&
        (latest && latest.analysis ? (
          <ResultsView
            t={t}
            latest={latest}
            leaders={leaders}
            view={view}
            setView={setView}
            scanDate={latest.createdAt ? format(latest.createdAt.toDate(), "PP", { locale }) : "—"}
          />
        ) : (
          <EmptyState text={t("bodyScanNoResults")} onCta={() => setTab("scan")} ctaLabel={t("bodyScanTabScan")} />
        ))}

      {tab === "progress" &&
        (progressData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("bodyScanProgressTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={progressData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, t("bodyFatTrend")]}
                  />
                  <Line
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <EmptyState text={t("noScansYet")} onCta={() => setTab("scan")} ctaLabel={t("bodyScanTabScan")} />
        ))}
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function BackLink({ label }: { label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
      <Link href="/dashboard">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

function Header({ t }: { t: (k: TranslationKey) => string }) {
  return (
    <div className="space-y-2">
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight font-headline">
        <ScanLine className="h-8 w-8 text-primary" />
        {t("bodyScanTitle")}
      </h1>
      <p className="text-muted-foreground">{t("bodyScanSubtitle")}</p>
    </div>
  );
}

function PhotoInput({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="group relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-background/50 text-center transition-colors hover:border-primary/50 dark:border-white/10 dark:bg-white/[0.03]">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <Upload className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="px-2 text-xs text-muted-foreground">{label}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
      />
    </label>
  );
}

function EmptyState({ text, onCta, ctaLabel }: { text: string; onCta: () => void; ctaLabel: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScanLine className="h-7 w-7" />
        </div>
        <p className="max-w-sm text-muted-foreground">{text}</p>
        <Button variant="outline" onClick={onCta}>
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function ResultsView({
  t,
  latest,
  leaders,
  view,
  setView,
  scanDate,
}: {
  t: (k: TranslationKey) => string;
  latest: NonNullable<ReturnType<typeof useBodyScans>["latest"]>;
  leaders: LeaderEntry[];
  view: ScanView;
  setView: (v: ScanView) => void;
  scanDate: string;
}) {
  const analysis = latest.analysis!;
  const rings = buildRings(latest.measurements, latest.unitSystem, t);
  const morph = deriveMorph(latest.measurements, latest.unitSystem);
  const scanLabels = scan3dLabels(t);
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <BodyScan3D
          rings={rings}
          morph={morph}
          zoneScores={analysis.zoneScores as ZoneScore[]}
          scanDate={scanDate}
          labels={scanLabels}
          className="h-[520px] sm:h-[600px]"
        />
        <p className="pt-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t("exportReport")}
        </p>
        <div className="flex justify-center gap-1 rounded-xl border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1">
          {(["front", "back"] as ScanView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                view === v
                  ? "bg-background dark:bg-white/[0.09] text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(v === "front" ? "frontView" : "backView")}
            </button>
          ))}
        </div>
        <GeneticReportCard
          view={view}
          zoneScores={analysis.zoneScores}
          leaders={leaders}
          scanDate={scanDate}
          bodyFat={analysis.bodyFatEstimate}
          bodyFatRange={analysis.bodyFatRange}
          labels={{
            title: t("geneticReport").toUpperCase(),
            scanDate: t("scanDate").toUpperCase(),
            bodyFat: t("bodyFatEstimate").toUpperCase(),
            exportReport: t("exportReport"),
            strong: t("zoneStrong"),
            average: t("zoneAverage"),
            weak: t("zoneWeak"),
          }}
        />
      </div>

      <div className="space-y-6">
        {analysis.summary && (
          <Card>
            <CardContent className="flex gap-3 p-5">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </CardContent>
          </Card>
        )}

        <PhysiqueReport
          measurements={latest.measurements}
          unitSystem={latest.unitSystem}
          bodyFat={analysis.bodyFatEstimate}
          bodyFatRange={analysis.bodyFatRange}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("muscleBalance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.zoneScores.map((z) => {
              const def = ZONES.find((d) => d.id === z.zone);
              const color = zoneColor(z.score);
              return (
                <div key={z.zone} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{def ? t(def.labelKey) : z.zone}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {z.score}
                      <Badge variant="outline" style={{ color, borderColor: color }} className="text-[10px]">
                        {t(zoneStatusKey(z.score))}
                      </Badge>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${z.score}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <PointsCard
            title={t("strongPoints")}
            points={analysis.strongPoints}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          />
          <PointsCard
            title={t("weakPoints")}
            points={analysis.weakPoints}
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dumbbell className="h-5 w-5 text-primary" />
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PointsCard({ title, points, icon }: { title: string; points: string[]; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
