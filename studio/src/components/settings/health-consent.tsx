'use client';

import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/stores/language-store';
import { db } from '@/lib/firebase';

const S = {
    title: { en: 'Health data consent', fr: 'Consentement aux données de santé' },
    label: { en: 'Allow SportMind to process my health data', fr: 'Autoriser SportMind à traiter mes données de santé' },
    body: {
        en: 'Height, weight, body measurements, nutrition and training. Withdrawing this stops the plans and the body tracking; the rest of your account keeps working, and you can turn it back on whenever you like.',
        fr: 'Taille, poids, mensurations, nutrition et entraînement. Retirer ce consentement désactive les plans et le suivi corporel ; le reste de votre compte continue de fonctionner, et vous pouvez le réactiver à tout moment.',
    },
    erase: { en: 'Deleting what is already stored', fr: 'Effacer ce qui est déjà enregistré' },
    eraseHint: {
        en: 'Withdrawing consent stops future processing. To remove what is already there, export your data below, then delete your account — or write to us and we will do it.',
        fr: 'Le retrait arrête les traitements futurs. Pour effacer ce qui existe déjà, exportez vos données ci-dessous puis supprimez votre compte — ou écrivez-nous et nous le ferons.',
    },
    saved: { en: 'Saved', fr: 'Enregistré' },
    failed: { en: 'Could not save. Try again.', fr: 'Enregistrement impossible. Réessayez.' },
} as const;

/**
 * The switch the privacy policy promises.
 *
 * Consent that cannot be withdrawn as easily as it was given is not valid
 * consent (GDPR art. 7(3)), so this has to be a control the athlete can reach
 * on their own — not an address to write to. Every change is written with a
 * timestamp, because a withdrawal has to be as demonstrable as the consent was.
 */
export function HealthConsentCard({ uid, initial }: { uid: string; initial: boolean }) {
    const language = useLanguageStore((s) => s.language);
    const tr = (b: { en: string; fr: string }) => (language === 'fr' ? b.fr : b.en);
    const { toast } = useToast();
    const [granted, setGranted] = useState(initial);
    const [saving, setSaving] = useState(false);

    const change = async (next: boolean) => {
        setSaving(true);
        const previous = granted;
        setGranted(next);
        try {
            await updateDoc(doc(db, 'users', uid), {
                'consent.healthData': next,
                'consent.healthDataChangedAt': serverTimestamp(),
            });
            toast({ title: tr(S.saved) });
        } catch {
            setGranted(previous);
            toast({ variant: 'destructive', title: tr(S.failed) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" /> {tr(S.title)}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="health-consent">{tr(S.label)}</Label>
                        <p className="text-xs leading-relaxed text-muted-foreground">{tr(S.body)}</p>
                    </div>
                    <Switch
                        id="health-consent"
                        checked={granted}
                        disabled={saving}
                        onCheckedChange={change}
                        aria-describedby="health-consent-hint"
                    />
                </div>
                <p id="health-consent-hint" className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{tr(S.erase)}: </span>
                    {tr(S.eraseHint)}
                </p>
            </CardContent>
        </Card>
    );
}
