"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
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
import { useBodyScans, type BodyScan } from "@/hooks/use-body-scans";
import { analyzeBody } from "@/ai/flows/body-analysis-flow";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";
import { MEASUREMENT_FIELDS, MEASUREMENT_ANCHORS, ZONES, unitLabel, zoneColor, zoneStatusKey, type MeasurementId, type Measurements, type MeasurementUnitSystem, type ZoneScore, type BodySex } from "@/lib/body-zones";
import { BodyWireframe, type LeaderEntry, type ScanView } from "@/components/body-scan/body-wireframe";
import { GeneticReportCard } from "@/components/body-scan/genetic-report-card";
import { BodyScan3D, type BodyScan3DLabels } from "@/components/body-scan/body-scan-3d";
import { ScanProgressViewer } from "@/components/body-scan/scan-progress-viewer";
import { PhotoScanFlow } from "@/components/body-scan/photo-scan-flow";
import { FitReport } from "@/components/body-scan/fit-report";
import type { ReviewedMeasurements } from "@/components/body-scan/measurement-review";
import { PhysiqueReport } from "@/components/body-scan/physique-report";
import { ScanHistoryBar } from "@/components/body-scan/scan-history-bar";



import { fitBodyMeasurements, impliedCircumferences } from "@/lib/body-fit";
import { toBodyMeasurements, modelSexFor } from "@/lib/body-fit/from-scan";

type TFn = (k: TranslationKey, vars?: Record<string, string | number>) => string;


/** Builds the holographic measuring bands from whatever measurements exist. */

function scan3dLabels(t: TFn): BodyScan3DLabels {
  return {
    title: t("geneticReport").toUpperCase(),
    front: t("frontView"),
    side: t("sideView"),
    back: t("backView"),
    hint: t("bodyScanDragHint"),
    reset: t("bodyScanResetView"),
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

  const { scans, addScan, deleteScan } = useBodyScans(user?.uid);

  const [tab, setTab] = useState<Tab>("scan");
  /**
   * Which saved scan the Results and Progress tabs are showing.
   *
   * `null` means "the newest", so a fresh analysis takes over on its own
   * without the athlete having to reselect anything. Every scan stays its own
   * document; nothing here overwrites or hides an earlier one.
   */
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"measurements" | "photos">("measurements");
  const [form, setForm] = useState<Record<MeasurementId, string>>(emptyForm);
  const [sport, setSport] = useState("general");
  const [sex, setSex] = useState<BodySex>("male");
  /**
   * Provenance for the numbers currently in the form.
   *
   * Everything is `manual` until the photo pipeline fills a field in, and a
   * value the athlete then edits on the review screen is `user_corrected`.
   */
  const [photoProvenance, setPhotoProvenance] = useState<{
    sources: Record<string, "manual" | "photo_estimated" | "user_corrected">;
    confidence: Record<string, number>;
  } | null>(null);
  const [view, setView] = useState<ScanView>("front");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const setField = (id: MeasurementId, value: string) => setForm((f) => ({ ...f, [id]: value }));

  /** Every scan that carries a finished analysis, newest first. */
  const analysedScans = useMemo(() => scans.filter((s) => s.analysis), [scans]);
  const selectedScan = useMemo(
    () => analysedScans.find((s) => s.id === selectedScanId) ?? analysedScans[0] ?? null,
    [analysedScans, selectedScanId],
  );


  const handleAnalyze = async () => {
    if (!user) return;

    // Collect whatever measurements are filled in.
    const parsed: Partial<Record<MeasurementId, number>> = {};
    for (const field of MEASUREMENT_FIELDS) {
      const num = parseFloat(form[field.id]);
      if (!isNaN(num) && num > 0) parsed[field.id] = num;
    }
    const hasAllMeasurements = MEASUREMENT_FIELDS.every((f) => parsed[f.id] !== undefined);
    // Both paths end here with the same numbers. Photo mode has already
    // written its confirmed values into the form.
    if (!hasAllMeasurements) {
      toast({ variant: "destructive", title: t("bodyScanIncomplete") });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeBody({
        userId: user.uid,
        unitSystem,
        sport,
        measurements: parsed,
      });
      // The flow reports why it stopped rather than throwing, because a server
      // action that throws reaches the browser as an opaque digest.
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: t(result.reason === "not-pro" ? "bodyScanErrorNotPro"
            : result.reason === "ai" ? "bodyScanError"
            : "bodyScanErrorServer"),
          // The Pro refusal is already said in full, in the athlete's own
          // language, by the title. The server's own wording only helps for
          // the failures nobody has written a sentence for.
          description: result.reason === "not-pro" ? undefined : result.detail,
        });
        return;
      }
      const analysis = result.analysis;
      // Only data. The body is rebuilt from the shared GLB client-side.
      const saveFit = fitBodyMeasurements({
        modelSex: modelSexFor(sex),
        ...toBodyMeasurements(parsed, unitSystem),
      });
      const savedId = await addScan({
        unitSystem, sport, sex,
        measurements: parsed,
        morphWeights: saveFit.weights as Record<string, number>,
        estimated: Object.values(photoProvenance?.sources ?? {}).some((v) => v === "photo_estimated"),
        measurementSources: photoProvenance?.sources ?? Object.fromEntries(
          MEASUREMENT_FIELDS.map((f) => [f.id, "manual" as const]),
        ),
        measurementConfidence: photoProvenance?.confidence,
        analysis,
      });
      // A refused write is not a saved scan. Announcing "scan enregistre" on
      // top of one and switching to a Results tab that reads from Firestore
      // left the athlete looking at an empty page they had just been told was
      // full.
      if (!savedId) {
        toast({ variant: "destructive", title: t("bodyScanSaveFailed") });
        return;
      }
      // Show the scan that was just taken, not whichever one was being read
      // before. Nothing is replaced — this only moves the selection.
      setSelectedScanId(savedId);
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
    if (!selectedScan) return [];
    const out: LeaderEntry[] = [];
    for (const field of MEASUREMENT_FIELDS) {
      if (!field.onBody) continue;
      const anchor = MEASUREMENT_ANCHORS[field.id];
      if (!anchor) continue;
      const value = selectedScan.measurements[field.id];
      if (value === undefined) continue;
      out.push({
        key: field.id,
        partLabel: t(field.labelKey),
        valueText: `${value} ${unitLabel(field.kind, selectedScan.unitSystem)}`,
        anchor,
      });
    }
    return out;
  }, [selectedScan, t]);

  /**
   * Removes one scan for good. The bar asks before this runs.
   *
   * The selection falls back to "the newest", which is what `null` means here
   * — deleting the scan you are reading should leave you on the next one, not
   * on a blank panel pointing at a document that no longer exists.
   */
  const handleDelete = async (scan: BodyScan) => {
    const removed = await deleteScan(scan.id);
    if (!removed) {
      toast({ variant: "destructive", title: t("bodyScanDeleteFailed") });
      return;
    }
    setSelectedScanId(null);
    toast({ title: t("bodyScanDeleted") });
  };

  /**
   * Load a past scan's numbers back into the form.
   *
   * A second analysis usually starts from the last one — a couple of values
   * change and the rest stay put. Retyping seven fields to find that out is
   * how a repeatable feature comes to feel like a one-off.
   */
  const reuseMeasurements = (scan: BodyScan) => {
    const next = { ...emptyForm };
    for (const field of MEASUREMENT_FIELDS) {
      const value = scan.measurements[field.id];
      if (value === undefined) continue;
      // Stored in the units of the day; the form speaks today's units.
      const converted =
        scan.unitSystem === unitSystem
          ? value
          : field.kind === "mass"
            ? (unitSystem === "imperial" ? value / 0.453592 : value * 0.453592)
            : (unitSystem === "imperial" ? value / 2.54 : value * 2.54);
      next[field.id] = String(Math.round(converted * 10) / 10);
    }
    setForm(next);
    if (scan.sex) setSex(scan.sex);
    if (scan.sport) setSport(scan.sport);
    // These numbers were typed, not measured from photographs.
    setPhotoProvenance(null);
    setInputMode("measurements");
    setTab("scan");
  };

  const parsedForm = useMemo<Partial<Record<MeasurementId, number>>>(() => {
    const out: Partial<Record<MeasurementId, number>> = {};
    (Object.keys(form) as MeasurementId[]).forEach((k) => {
      const n = parseFloat(form[k]);
      if (!Number.isNaN(n) && n > 0) out[k] = n;
    });
    return out;
  }, [form]);

  /**
   * The fit, recomputed only when a measurement actually changes.
   *
   * Everything costly — slicing the mesh, hunting landmarks, measuring hull
   * perimeters — happened offline when the calibration was built, so this is
   * table lookup and interpolation and is cheap enough to run on a keystroke.
   */
  /**
   * Photo mode is only offered once height and weight are in.
   *
   * Height is the pipeline's only metric reference — every circumference is
   * scaled by it — and weight feeds the body-composition prior. Neither is
   * estimated from the photographs, so neither can be skipped.
   */
  const photoHeightCm = useMemo(() => {
    const raw = parseFloat(form.height);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return unitSystem === "imperial" ? raw * 2.54 : raw;
  }, [form.height, unitSystem]);
  const photoReady = photoHeightCm > 0 && parseFloat(form.weight) > 0;

  /**
   * The review screen's output is the same shape manual entry produces, so
   * both paths meet at one `BodyMeasurements` and one fitting engine.
   */
  const handlePhotoMeasured = async (reviewed: ReviewedMeasurements) => {
    const next = { ...form };
    const toDisplay = (cm: number) => (unitSystem === "imperial" ? cm / 2.54 : cm);
    next.chest = toDisplay(reviewed.values.chest).toFixed(1);
    next.waist = toDisplay(reviewed.values.waist).toFixed(1);
    next.hips = toDisplay(reviewed.values.hips).toFixed(1);
    next.arms = toDisplay(reviewed.values.upperArm).toFixed(1);
    next.thighs = toDisplay(reviewed.values.thigh).toFixed(1);
    setForm(next);
    setPhotoProvenance({
      sources: {
        height: "manual", weight: "manual",
        chest: reviewed.sources.chest, waist: reviewed.sources.waist,
        hips: reviewed.sources.hips, arms: reviewed.sources.upperArm,
        thighs: reviewed.sources.thigh,
      },
      confidence: {
        chest: reviewed.confidence.chest, waist: reviewed.confidence.waist,
        hips: reviewed.confidence.hips, arms: reviewed.confidence.upperArm,
        thighs: reviewed.confidence.thigh,
      },
    });
    setInputMode("measurements");
    toast({ title: t("bodyScanPhotoMeasured") });
  };

  /** Only what the athlete actually typed is worth comparing against. */
  const liveRequested = useMemo(() => {
    const m = toBodyMeasurements(parsedForm, unitSystem);
    return { chest: m.chestCm, waist: m.waistCm, hips: m.hipsCm, upperArm: m.upperArmCm, thigh: m.thighCm };
  }, [parsedForm, unitSystem]);

  /** What the entered height and weight imply where no tape was given. */
  const liveImplied = useMemo(() => {
    const m = toBodyMeasurements(parsedForm, unitSystem);
    return m.weightKg && m.weightKg > 0
      ? impliedCircumferences(modelSexFor(sex), m.heightCm, m.weightKg)
      : undefined;
  }, [parsedForm, unitSystem, sex]);

  const liveFit = useMemo(
    () => fitBodyMeasurements({
      modelSex: modelSexFor(sex),
      ...toBodyMeasurements(parsedForm, unitSystem),
    }),
    [parsedForm, unitSystem, sex],
  );
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
      <div className="inline-flex rounded-lg border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1 shadow-card">
        {(["scan", "results", "progress"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
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
          <div className="flex flex-col gap-3">
            <BodyScan3D
              modelSex={modelSexFor(sex)}
              weights={liveFit.weights}
              bodyHeightCm={liveFit.predicted.heightCm}
              circumferences={liveFit.predicted}
              labels={scanLabels}
              className="h-[480px] sm:h-[560px] lg:flex-1 lg:min-h-[520px]"
            />
            {/* Requested against represented, so a value the mesh cannot reach
                is visible rather than silently clamped to an average body. */}
            <FitReport fit={liveFit} requested={liveRequested} implied={liveImplied} />
          </div>
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>{t("bodyScanMeasurements")}</CardTitle>
                <CardDescription>{t("bodyScanInputChoiceHint")}</CardDescription>
              </div>
              <div className="inline-flex w-full rounded-lg border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1">
                {(["measurements", "photos"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInputMode(m)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
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
                <Label className="text-xs text-muted-foreground">{t("bodyScanBodyType")}</Label>
                <div className="inline-flex w-full rounded-lg border border-border/60 dark:border-white/[0.07] bg-muted/50 dark:bg-white/[0.03] p-1">
                  {(["male", "female", "neutral"] as BodySex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      aria-pressed={sex === s}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                        sex === s
                          ? "bg-background dark:bg-white/[0.09] text-foreground shadow-card"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(s === "male" ? "bodyTypeMale" : s === "female" ? "bodyTypeFemale" : "bodyTypeNeutral")}
                    </button>
                  ))}
                </div>
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

              {/*
                Photo mode measures geometrically on this device. It needs an
                exact height to scale the silhouette and a weight for the
                body-composition prior; neither is guessed from the images.
              */}
              {inputMode === "photos" && (
                <div className="space-y-3">
                  {photoReady ? (
                    <PhotoScanFlow
                      heightCm={photoHeightCm}
                      onComplete={handlePhotoMeasured}
                      onCancel={() => setInputMode("measurements")}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                      {t("bodyScanNeedHeightWeight")}
                    </p>
                  )}
                </div>
              )}

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
        (selectedScan ? (
          <div className="space-y-6">
            <ScanHistoryBar
              t={t}
              locale={locale}
              scans={analysedScans}
              selectedId={selectedScan.id}
              onSelect={setSelectedScanId}
              onReuse={() => reuseMeasurements(selectedScan)}
              onDelete={() => void handleDelete(selectedScan)}
              onNewScan={() => setTab("scan")}
            />
            <ResultsView
              t={t}
              scan={selectedScan}
              leaders={leaders}
              view={view}
              setView={setView}
              scanDate={selectedScan.createdAt ? format(selectedScan.createdAt.toDate(), "PP", { locale }) : "—"}
            />
          </div>
        ) : (
          <EmptyState text={t("bodyScanNoResults")} onCta={() => setTab("scan")} ctaLabel={t("bodyScanTabScan")} />
        ))}

      {tab === "progress" && scans.length > 0 && (
        <div className="mb-6">
          {/* The same selection as the Results tab, so a date picked in one
              place is the body shown in the other. */}
          <ScanProgressViewer
            scans={scans}
            selectedId={selectedScan?.id ?? null}
            onSelect={setSelectedScanId}
            labels={scan3dLabels(t)}
            unitLabel={unitLabel}
            t={t as any}
          />
        </div>
      )}

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
  scan,
  leaders,
  view,
  setView,
  scanDate,
}: {
  t: (k: TranslationKey) => string;
  scan: BodyScan;
  leaders: LeaderEntry[];
  view: ScanView;
  setView: (v: ScanView) => void;
  scanDate: string;
}) {
  const analysis = scan.analysis!;
  // Rebuilt from the stored measurements against the shared GLB — no per-user
  // model file is ever written.
  const fit = fitBodyMeasurements({
    modelSex: modelSexFor(scan.sex),
    ...toBodyMeasurements(scan.measurements, scan.unitSystem),
  });
  const scanLabels = scan3dLabels(t);
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <BodyScan3D
          modelSex={modelSexFor(scan.sex)}
          weights={fit.weights}
          bodyHeightCm={fit.predicted.heightCm}
          circumferences={fit.predicted}
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
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
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
          measurements={scan.measurements}
          unitSystem={scan.unitSystem}
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
