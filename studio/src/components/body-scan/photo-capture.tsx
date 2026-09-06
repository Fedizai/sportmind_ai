'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, RefreshCw, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/stores/language-store';
import { cn } from '@/lib/utils';
import type { ShotKind } from '@/lib/body-photo/types';

/** Local bilingual copy, following the sport modules rather than growing i18n.ts. */
const S = {
    frontTitle: { en: 'Front photo', fr: 'Photo de face' },
    sideTitle: { en: 'Side photo', fr: 'Photo de profil' },
    frontHint: {
        en: 'Face the camera. Stand straight, feet slightly apart, arms a little away from your body.',
        fr: 'Face à la caméra. Debout, pieds légèrement écartés, bras un peu écartés du corps.',
    },
    sideHint: {
        en: 'Turn a quarter to your left. Arms relaxed at your sides, look straight ahead.',
        fr: 'Tourne-toi d\'un quart vers la gauche. Bras relâchés, regard droit devant.',
    },
    fitHint: {
        en: 'Fill the outline — your head and your feet must both be inside the frame.',
        fr: 'Remplis la silhouette — ta tête et tes pieds doivent être dans le cadre.',
    },
    clothingHint: {
        en: 'Close-fitting clothes and a plain background give the best result.',
        fr: 'Des vêtements près du corps et un fond uni donnent le meilleur résultat.',
    },
    capture: { en: 'Capture', fr: 'Capturer' },
    retake: { en: 'Retake', fr: 'Reprendre' },
    useThis: { en: 'Use this photo', fr: 'Utiliser cette photo' },
    upload: { en: 'Choose a file instead', fr: 'Choisir un fichier' },
    starting: { en: 'Starting the camera…', fr: 'Démarrage de la caméra…' },
    noCamera: {
        en: 'No camera available here — choose a photo from your device.',
        fr: 'Pas de caméra ici — choisis une photo depuis ton appareil.',
    },
    step: { en: 'Step {n} of 2', fr: 'Étape {n} sur 2' },
} as const;

/**
 * A guided outline the athlete stands inside.
 *
 * Front and side are different shapes on purpose: the front outline is wide at
 * the shoulders with the arms held clear of the ribs, because the chest cannot
 * be measured at all when the arms are pressed against the body. The side
 * outline is narrow and shows the arms tucked, which is what makes the depth
 * reading a torso rather than a torso plus an arm.
 */
function SilhouetteOverlay({ kind }: { kind: ShotKind }) {
    const common = { fill: 'none', strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke' as const };
    return (
        <svg
            aria-hidden
            viewBox="0 0 100 200"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 h-full w-full"
        >
            <g stroke="currentColor" strokeDasharray="4 3" opacity={0.75} {...common}>
                {kind === 'front' ? (
                    <>
                        <ellipse cx="50" cy="18" rx="8.5" ry="10.5" />
                        <path d="M50 29 v6" />
                        {/* shoulders → arms held clear of the ribs → hands */}
                        <path d="M50 35 L32 41 L20 74 L15 100" />
                        <path d="M50 35 L68 41 L80 74 L85 100" />
                        {/* torso: chest, waist, hips */}
                        <path d="M32 41 L29 68 L33 92 L30 116" />
                        <path d="M68 41 L71 68 L67 92 L70 116" />
                        {/* legs, slightly apart */}
                        <path d="M30 116 L27 158 L26 190 M50 118 L50 190" opacity={0.55} />
                        <path d="M70 116 L73 158 L74 190" />
                        <path d="M20 190 h14 M66 190 h14" />
                    </>
                ) : (
                    <>
                        <ellipse cx="50" cy="18" rx="9" ry="10.5" />
                        <path d="M52 29 v6" />
                        {/* chest forward, seat back — the depth the side shot exists to give */}
                        <path d="M40 36 C34 52 36 70 40 92 C42 108 40 112 40 116" />
                        <path d="M60 36 C68 50 62 68 58 90 C62 104 62 110 60 116" />
                        <path d="M40 36 C46 32 56 32 60 36" />
                        {/* the arm tucked against the side */}
                        <path d="M56 40 L58 74 L56 96" opacity={0.5} />
                        <path d="M40 116 L40 158 L38 190 M60 116 L60 158 L62 190" />
                        <path d="M32 190 h16 M54 190 h16" />
                    </>
                )}
            </g>
        </svg>
    );
}

interface PhotoCaptureProps {
    kind: ShotKind;
    stepIndex: number;
    /** Returns a data URI for the captured or chosen photo. */
    onCapture: (dataUri: string) => void;
    onCancel: () => void;
    /** Shown under the frame when the previous attempt was refused. */
    problem?: string | null;
    busy?: boolean;
}

export function PhotoCapture({ kind, stepIndex, onCapture, onCancel, problem, busy }: PhotoCaptureProps) {
    const language = useLanguageStore((s) => s.language);
    const tr = (v: { en: string; fr: string }) => (language === 'fr' ? v.fr : v.en);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<'starting' | 'live' | 'unavailable'>('starting');
    const [preview, setPreview] = useState<string | null>(null);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
                const stream = await navigator.mediaDevices.getUserMedia({
                    // The rear camera on a phone: the athlete props the device
                    // up and steps back, so the front camera is the wrong one.
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1080 }, height: { ideal: 1920 } },
                    audio: false,
                });
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => undefined);
                }
                setStatus('live');
            } catch {
                if (!cancelled) setStatus('unavailable');
            }
        })();
        return () => { cancelled = true; stop(); };
    }, [stop]);

    const shoot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg', 0.92));
    };

    const chooseFile = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPreview(String(reader.result));
        reader.readAsDataURL(file);
    };

    const title = tr(kind === 'front' ? S.frontTitle : S.sideTitle);
    const hint = tr(kind === 'front' ? S.frontHint : S.sideHint);

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {tr(S.step).replace('{n}', String(stepIndex))}
                    </p>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { stop(); onCancel(); }} aria-label="close">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-primary/20 bg-black">
                {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={cn('h-full w-full object-cover', status !== 'live' && 'opacity-0')}
                    />
                )}

                <div className="absolute inset-0 text-primary/70"><SilhouetteOverlay kind={kind} /></div>

                {status === 'starting' && !preview && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/70">
                        <Loader2 className="h-4 w-4 animate-spin" /> {tr(S.starting)}
                    </div>
                )}
                {status === 'unavailable' && !preview && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
                        {tr(S.noCamera)}
                    </div>
                )}

                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-center text-xs text-white/85">
                    {hint} {tr(S.fitHint)}
                </p>
            </div>

            {problem && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive-foreground">
                    {problem}
                </p>
            )}
            <p className="text-center text-[11px] text-muted-foreground">{tr(S.clothingHint)}</p>

            <div className="flex flex-wrap items-center justify-center gap-2">
                {preview ? (
                    <>
                        <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>
                            <RefreshCw className="mr-2 h-4 w-4" /> {tr(S.retake)}
                        </Button>
                        <Button onClick={() => onCapture(preview)} disabled={busy}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            {tr(S.useThis)}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={shoot} disabled={status !== 'live'}>
                            <Camera className="mr-2 h-4 w-4" /> {tr(S.capture)}
                        </Button>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                            <Upload className="h-3.5 w-3.5" />
                            {tr(S.upload)}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                    </>
                )}
            </div>
        </div>
    );
}
