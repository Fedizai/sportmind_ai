'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

import { useLanguageStore } from '@/stores/language-store';
import { PhotoCapture } from './photo-capture';
import { MeasurementReview, type ReviewedMeasurements } from './measurement-review';
import { measureFromPhotos, type ShotAnalysis } from '@/lib/body-photo/measure';
import { analyseShot, loadImage, releasePoseLandmarker } from '@/lib/body-photo/pose';
import type { PhotoMeasurementSuccess, Rejection, RejectionCode, ShotKind } from '@/lib/body-photo/types';

const S = {
    analysing: { en: 'Measuring…', fr: 'Mesure en cours…' },
    loadingModel: { en: 'Loading the vision model (first time only)…', fr: 'Chargement du modèle (première fois seulement)…' },
    privacy: {
        en: 'Your photos are analysed on this device and are never uploaded. Only the measurements are saved.',
        fr: 'Tes photos sont analysées sur cet appareil et ne sont jamais envoyées. Seules les mesures sont enregistrées.',
    },
    failed: { en: 'That photo cannot be measured', fr: 'Cette photo ne peut pas être mesurée' },
} as const;

/** Plain reasons, phrased as what to do differently. */
const REASON: Record<RejectionCode, { en: string; fr: string }> = {
    no_person: {
        en: 'No one was detected. Make sure your whole body is in the frame.',
        fr: "Personne n'a été détecté. Assure-toi que tout ton corps est dans le cadre.",
    },
    multiple_people: {
        en: 'More than one person is in the shot. You need to be alone in the frame.',
        fr: 'Il y a plus d\'une personne. Tu dois être seul dans le cadre.',
    },
    low_confidence: {
        en: 'The pose could not be read clearly. Try better lighting.',
        fr: 'La posture n\'a pas pu être lue. Essaie avec un meilleur éclairage.',
    },
    missing_landmarks: {
        en: 'Some joints are hidden. Keep your arms clear of your body and your legs slightly apart.',
        fr: 'Des articulations sont cachées. Écarte les bras du corps et les jambes légèrement.',
    },
    body_cut_off: {
        en: 'Your head or feet are outside the frame. Move the camera back — the full body must be visible.',
        fr: 'Ta tête ou tes pieds sortent du cadre. Recule la caméra — tout le corps doit être visible.',
    },
    too_rotated: {
        en: 'You are turned too far. Square to the camera for the front shot, a clean quarter turn for the side.',
        fr: 'Tu es trop tourné. Bien de face pour la photo de face, un quart de tour net pour le profil.',
    },
    too_blurry: {
        en: 'The photo is too soft. Hold still, or prop the phone up and use the timer.',
        fr: 'La photo est floue. Reste immobile, ou pose le téléphone et utilise le retardateur.',
    },
    unreliable_segmentation: {
        en: 'Your outline could not be separated from the background. Try a plainer wall and closer-fitting clothes.',
        fr: 'Ta silhouette n\'a pas pu être séparée du fond. Essaie un mur uni et des vêtements près du corps.',
    },
    scale_mismatch: {
        en: 'The two photos were taken from different distances. Keep the camera in the same spot for both.',
        fr: 'Les deux photos ont été prises à des distances différentes. Garde la caméra au même endroit.',
    },
};

interface Props {
    heightCm: number;
    onComplete: (reviewed: ReviewedMeasurements) => void;
    onCancel: () => void;
}

/**
 * Export the analysed shots so the validation harness can replay them.
 *
 * Node has no MediaPipe runtime in this project, so a real-world case is
 * produced here — masks and landmarks, never the photograph — and scored
 * offline against tape measurements. Off unless `?validate=1` is on the URL,
 * because keeping the analysis around at all is a retention decision and the
 * default has to be not to.
 */
function exportCase(front: ShotAnalysis, side: ShotAnalysis, heightCm: number) {
    const plain = (s: ShotAnalysis) => ({
        kind: s.kind,
        mask: { width: s.mask.width, height: s.mask.height, data: Array.from(s.mask.data) },
        landmarks: s.landmarks,
        poseCount: s.poseCount,
        blurVariance: s.blurVariance,
    });
    const blob = new Blob(
        [JSON.stringify({ heightCm, front: plain(front), side: plain(side) })],
        { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `body-photo-case-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Capture, measure, review — and nothing kept that does not have to be.
 *
 * The photographs live in component state for as long as the model needs them
 * and are dropped the moment measuring finishes. They are never uploaded, never
 * written to Firestore and never sent to a model provider: the whole pipeline
 * runs in this browser. What survives is a handful of centimetre values the
 * athlete has looked at and agreed to.
 *
 * A failed check ends the run. There is no fallback estimate, because a body
 * scanner that answers when it cannot see is worse than one that asks for
 * another photo.
 */
export function PhotoScanFlow({ heightCm, onComplete, onCancel }: Props) {
    const language = useLanguageStore((s) => s.language);
    const tr = (v: { en: string; fr: string }) => (language === 'fr' ? v.fr : v.en);

    const [step, setStep] = useState<ShotKind | 'analysing' | 'review'>('front');
    const [problem, setProblem] = useState<string | null>(null);
    const [estimate, setEstimate] = useState<PhotoMeasurementSuccess | null>(null);
    const [busy, setBusy] = useState(false);

    /** Held only until measuring finishes, then dropped. */
    const shots = useRef<Partial<Record<ShotKind, ShotAnalysis>>>({});

    useEffect(() => () => { shots.current = {}; releasePoseLandmarker(); }, []);

    const describe = useCallback(
        (rejections: Rejection[]) =>
            rejections.map((r) => tr(REASON[r.code])).filter((v, i, a) => a.indexOf(v) === i).join(' '),
        [language], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleCapture = async (kind: ShotKind, dataUri: string) => {
        setBusy(true);
        setProblem(null);
        try {
            const image = await loadImage(dataUri);
            const analysis = await analyseShot(image, kind);
            shots.current[kind] = analysis;

            if (kind === 'front') { setStep('side'); return; }

            setStep('analysing');
            const front = shots.current.front!;
            const sideShot = shots.current.side!;
            const result = measureFromPhotos(front, sideShot, heightCm);

            if (new URLSearchParams(window.location.search).get('validate') === '1') {
                exportCase(front, sideShot, heightCm);
            }

            // The photographs have done their job; drop them before anything
            // else happens.
            shots.current = {};

            if (!result.ok) {
                // A 'both' failure (the two shots disagree on scale) is fixed
                // by retaking the front, which is where the sequence restarts.
                const blamed = result.rejections.find((r) => r.shot !== 'both')?.shot;
                const blame: ShotKind = blamed === 'side' ? 'side' : 'front';
                setProblem(describe(result.rejections));
                setStep(blame);
                return;
            }
            setEstimate(result);
            setStep('review');
        } catch (error) {
            setProblem(error instanceof Error ? error.message : String(error));
            setStep(kind);
        } finally {
            setBusy(false);
        }
    };

    if (step === 'analysing') {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm font-medium">{tr(S.analysing)}</p>
                <p className="max-w-[38ch] text-xs text-muted-foreground">{tr(S.loadingModel)}</p>
            </div>
        );
    }

    if (step === 'review' && estimate) {
        return (
            <MeasurementReview
                estimate={estimate}
                onConfirm={onComplete}
                onBack={() => { setEstimate(null); setStep('front'); }}
            />
        );
    }

    const shot: ShotKind = step === 'side' ? 'side' : 'front';
    return (
        <div className="space-y-3">
            <PhotoCapture
                kind={shot}
                stepIndex={shot === 'front' ? 1 : 2}
                onCapture={(uri) => handleCapture(shot, uri)}
                onCancel={onCancel}
                problem={problem ? `${tr(S.failed)}. ${problem}` : null}
                busy={busy}
            />
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {tr(S.privacy)}
            </p>
        </div>
    );
}
