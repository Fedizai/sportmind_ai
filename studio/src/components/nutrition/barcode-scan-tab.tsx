"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle, Barcode, Camera, CameraOff, Check, Loader2, Minus, PenSquare, Plus, ScanLine, Search,
} from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import {
  openRearCamera, startScanning, type BarcodeScanner, type CameraError,
} from '@/lib/barcode-detect';
import type { OffProduct } from '@/lib/openfoodfacts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Barcode Scan — a packaged product, identified exactly.
 *
 * Deliberately separate from the Scan tab beside it. That one photographs a
 * whole plate and asks a vision model what is on it; this one reads the
 * barcode and looks the product up in Open Food Facts, so the numbers come off
 * the actual packaging rather than from a model's estimate.
 *
 * Nothing here is ever invented. A barcode with no product, or a product with
 * no nutrition facts, says so and offers the manual routes instead.
 */

type Phase = 'idle' | 'starting' | 'scanning' | 'looking_up' | 'result';
type LookupProblem = 'not_found' | 'no_nutrition' | 'unavailable' | 'rate_limited';

export interface ScannedFoodItem {
  name: string;
  portion: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  iron: number;
  potassium: number;
}

interface BarcodeScanTabProps {
  /** Logs the scanned serving through the app's existing nutrition logging. */
  onAddToToday: (item: ScannedFoodItem) => Promise<void> | void;
  isLogging: boolean;
  /** Jumps to the Search / Manual Entry tabs when a product cannot be found. */
  onGoToSearch: (query: string) => void;
  onGoToManual: () => void;
}

const NUTRISCORE_STYLE: Record<string, string> = {
  a: 'bg-emerald-600 text-white',
  b: 'bg-lime-600 text-white',
  c: 'bg-yellow-500 text-black',
  d: 'bg-orange-500 text-white',
  e: 'bg-red-600 text-white',
};

/** A macro row. Renders "—" rather than 0 when Open Food Facts has no value. */
function NutrientRow({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {value === undefined ? '—' : `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`}
      </span>
    </div>
  );
}

export function BarcodeScanTab({
  onAddToToday, isLogging, onGoToSearch, onGoToManual,
}: BarcodeScanTabProps) {
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<BarcodeScanner | null>(null);
  /**
   * The last barcode acted on. The camera reads the same code in every frame,
   * so without this a single package would fire a lookup several times a
   * second and burn through Open Food Facts' rate limit on its own.
   */
  const handledRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [problem, setProblem] = useState<LookupProblem | null>(null);
  const [lastCode, setLastCode] = useState<string>('');
  const [grams, setGrams] = useState(100);
  const [manualCode, setManualCode] = useState('');
  const [added, setAdded] = useState(false);

  const stopCamera = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const lookup = useCallback(async (code: string) => {
    setPhase('looking_up');
    setLastCode(code);
    setProduct(null);
    setProblem(null);
    setAdded(false);

    try {
      const response = await fetch(`/api/nutrition/barcode/${encodeURIComponent(code)}`);
      const body = await response.json().catch(() => null);

      if (response.status === 404) { setProblem('not_found'); setPhase('result'); return; }
      if (response.status === 429) { setProblem('rate_limited'); setPhase('result'); return; }
      if (!response.ok || body?.status !== 'found') {
        setProblem('unavailable'); setPhase('result'); return;
      }

      const found = body.product as OffProduct;
      setProduct(found);
      // Open the serving at whatever the pack itself declares; fall back to
      // 100 g, which is the basis the figures are quoted on.
      setGrams(found.servingGrams && found.servingGrams > 0 ? Math.round(found.servingGrams) : 100);
      if (!found.hasNutrition) setProblem('no_nutrition');
      setPhase('result');
    } catch {
      setProblem('unavailable');
      setPhase('result');
    }
  }, []);

  const handleDetection = useCallback((code: string) => {
    if (handledRef.current === code) return;
    handledRef.current = code;
    stopCamera();
    lookup(code);
  }, [lookup, stopCamera]);

  const startCamera = useCallback(async () => {
    setPhase('starting');
    setCameraError(null);
    handledRef.current = null;

    const camera = await openRearCamera();
    if (!camera.ok) {
      setCameraError(camera.error);
      setPhase('idle');
      return;
    }

    streamRef.current = camera.stream;
    const video = videoRef.current;
    if (!video) {
      camera.stream.getTracks().forEach((track) => track.stop());
      setPhase('idle');
      return;
    }

    video.srcObject = camera.stream;
    // iOS refuses to play an inline video that has not been explicitly told to.
    try { await video.play(); } catch { /* autoplay attribute covers it */ }

    try {
      scannerRef.current = await startScanning(video, camera.stream, handleDetection);
      setPhase('scanning');
    } catch (err) {
      console.error('Barcode engine failed to start:', err);
      stopCamera();
      setCameraError('failed');
      setPhase('idle');
    }
  }, [handleDetection, stopCamera]);

  // The camera must never outlive the tab.
  useEffect(() => () => stopCamera(), [stopCamera]);

  const reset = () => {
    handledRef.current = null;
    setProduct(null);
    setProblem(null);
    setLastCode('');
    setAdded(false);
    setPhase('idle');
  };

  const submitManualCode = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = manualCode.replace(/\D/g, '');
    if (digits.length < 6) return;
    stopCamera();
    handledRef.current = digits;
    lookup(digits);
  };

  // --- Serving maths: per-100 g figures scaled to the chosen amount ---------
  const per100 = product?.per100g;
  const factor = grams / 100;
  const scaled = (value?: number) => (value === undefined ? undefined : value * factor);

  const canAdd = !!product && product.hasNutrition && grams > 0;

  const addToToday = async () => {
    if (!product || !per100) return;
    // "Nutella" branded "Nutella" should not log as "Nutella Nutella".
    const brand = product.brand?.trim();
    const title = product.name?.trim();
    const label = !brand ? title
      : !title ? brand
      : title.toLowerCase().includes(brand.toLowerCase()) ? title
      : `${brand} ${title}`;

    await onAddToToday({
      name: label || t('barcodeUnnamedProduct'),
      portion: grams,
      calories: scaled(per100.calories) ?? 0,
      protein: scaled(per100.protein) ?? 0,
      carbs: scaled(per100.carbs) ?? 0,
      fat: scaled(per100.fat) ?? 0,
      sugar: scaled(per100.sugar) ?? 0,
      sodium: scaled(per100.sodium) ?? 0,
      iron: 0,
      potassium: 0,
    });
    setAdded(true);
  };

  const cameraMessage: Record<CameraError, string> = {
    denied: t('barcodeCameraDenied'),
    not_found: t('barcodeCameraNotFound'),
    unsupported: t('barcodeCameraUnsupported'),
    failed: t('barcodeCameraFailed'),
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            {t('barcodeScanTitle')}
          </CardTitle>
          <CardDescription>{t('barcodeScanSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <video
              ref={videoRef}
              className={cn(
                'h-full w-full object-cover',
                phase === 'scanning' || phase === 'starting' ? 'opacity-100' : 'opacity-0'
              )}
              autoPlay
              playsInline
              muted
            />

            {phase === 'scanning' && (
              // A reticle, so it is obvious where to hold the package.
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-28 w-4/5 max-w-xs rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <ScanLine className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse text-white/90" />
                </div>
              </div>
            )}

            {(phase === 'idle' || phase === 'result') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <Camera className="mb-3 h-10 w-10" />
                <p className="text-sm font-medium">{t('barcodePointAtBarcode')}</p>
              </div>
            )}

            {phase === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {cameraError && (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>{t('barcodeCameraProblem')}</AlertTitle>
              <AlertDescription>{cameraMessage[cameraError]}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {phase === 'scanning' ? (
              <Button variant="secondary" className="w-full" onClick={() => { stopCamera(); setPhase('idle'); }}>
                <CameraOff className="mr-2 h-4 w-4" />
                {t('barcodeStopCamera')}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={startCamera}
                disabled={phase === 'starting' || phase === 'looking_up'}
              >
                {phase === 'starting'
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Camera className="mr-2 h-4 w-4" />}
                {t('barcodeStartCamera')}
              </Button>
            )}
          </div>

          {/* A typed barcode covers a damaged label, a locked-down camera, and desktop. */}
          <form onSubmit={submitManualCode} className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={t('barcodeTypeCodePlaceholder')}
              inputMode="numeric"
              aria-label={t('barcodeTypeCodePlaceholder')}
            />
            <Button type="submit" variant="outline" disabled={manualCode.replace(/\D/g, '').length < 6}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {phase === 'looking_up' && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('barcodeLookingUp')}
          </CardContent>
        </Card>
      )}

      {phase === 'result' && problem && problem !== 'no_nutrition' && (
        <Card>
          <CardContent className="space-y-4 py-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">
                {problem === 'not_found' ? t('barcodeNotFoundTitle')
                  : problem === 'rate_limited' ? t('barcodeRateLimitedTitle')
                  : t('barcodeUnavailableTitle')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {problem === 'not_found' ? t('barcodeNotFoundBody', { code: lastCode })
                  : problem === 'rate_limited' ? t('barcodeRateLimitedBody')
                  : t('barcodeUnavailableBody')}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => onGoToSearch('')}>
                <Search className="mr-2 h-4 w-4" />
                {t('barcodeSearchManually')}
              </Button>
              <Button variant="outline" onClick={onGoToManual}>
                <PenSquare className="mr-2 h-4 w-4" />
                {t('barcodeEnterManually')}
              </Button>
              <Button variant="ghost" onClick={reset}>{t('barcodeScanAnother')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'result' && product && (
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {t('barcodeProductFound')}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {product.imageUrl ? (
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border bg-white">
                  <Image
                    src={product.imageUrl}
                    alt={product.name ?? ''}
                    fill
                    sizes="128px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <Barcode className="h-10 w-10" />
                </div>
              )}

              <div className="min-w-0 flex-grow text-center sm:text-left">
                <h3 className="text-lg font-bold leading-tight">
                  {product.name ?? t('barcodeUnnamedProduct')}
                </h3>
                {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {t('barcodeLabel')} {product.barcode}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {product.quantity && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{product.quantity}</span>
                  )}
                  {product.nutriScore && NUTRISCORE_STYLE[product.nutriScore] && (
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-bold uppercase',
                        NUTRISCORE_STYLE[product.nutriScore]
                      )}
                    >
                      {t('nutriScore')} {product.nutriScore}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {problem === 'no_nutrition' ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('barcodeNoNutritionTitle')}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{t('barcodeNoNutritionBody')}</p>
                  <Button size="sm" variant="outline" onClick={onGoToManual}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    {t('barcodeEnterManually')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t('barcodePer100g')}
                  </p>
                  <NutrientRow label={t('calories')} value={per100?.calories} unit="kcal" />
                  <NutrientRow label={t('protein')} value={per100?.protein} unit="g" />
                  <NutrientRow label={t('carbs')} value={per100?.carbs} unit="g" />
                  <NutrientRow label={t('fat')} value={per100?.fat} unit="g" />
                  <NutrientRow label={t('barcodeSaturatedFat')} value={per100?.saturatedFat} unit="g" />
                  <NutrientRow label={t('sugar')} value={per100?.sugar} unit="g" />
                  <NutrientRow label={t('barcodeFiber')} value={per100?.fiber} unit="g" />
                  <NutrientRow label={t('barcodeSalt')} value={per100?.salt} unit="g" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t('barcodeServing')}
                    {product.servingSize && (
                      <span className="ml-2 font-normal normal-case tracking-normal">
                        ({t('barcodePackServing')} {product.servingSize})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t('barcodeDecrease')}
                      onClick={() => setGrams((g) => Math.max(5, g - 10))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="relative flex-grow">
                      <Input
                        type="number"
                        min={1}
                        value={grams}
                        onChange={(e) => setGrams(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="pr-8 text-center text-lg font-semibold tabular-nums"
                        aria-label={t('barcodeServing')}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        g
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t('barcodeIncrease')}
                      onClick={() => setGrams((g) => g + 10)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {t('barcodeYourServing')}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {Math.round(scaled(per100?.calories) ?? 0)} kcal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {Math.round(scaled(per100?.protein) ?? 0)}P · {Math.round(scaled(per100?.carbs) ?? 0)}C · {Math.round(scaled(per100?.fat) ?? 0)}F
                  </p>
                </div>

                {product.allergens.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('barcodeAllergens')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.allergens
                        .map((a) => a.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
                        .join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full" onClick={addToToday} disabled={!canAdd || isLogging}>
                    {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : added ? <Check className="mr-2 h-4 w-4" />
                      : <Plus className="mr-2 h-4 w-4" />}
                    {added ? t('barcodeAdded') : t('barcodeAddToToday')}
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={reset}>
                    {t('barcodeScanAnother')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
