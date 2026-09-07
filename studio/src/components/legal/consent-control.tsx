'use client';

import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConsentStore } from '@/stores/consent-store';
import { useLanguageStore } from '@/stores/language-store';

const S = {
    heading: { en: 'Your current choice', fr: 'Votre choix actuel' },
    granted: { en: 'Analytics is on. You accepted it.', fr: 'Les mesures d’audience sont actives. Vous les avez acceptées.' },
    denied: { en: 'Analytics is off. You refused it.', fr: 'Les mesures d’audience sont désactivées. Vous les avez refusées.' },
    undecided: { en: 'You have not answered yet. Nothing is loaded.', fr: 'Vous n’avez pas encore répondu. Rien n’est chargé.' },
    turnOn: { en: 'Turn analytics on', fr: 'Activer les mesures' },
    turnOff: { en: 'Turn analytics off', fr: 'Désactiver les mesures' },
} as const;

/**
 * Change your mind, on the page that explains what you are changing.
 *
 * Withdrawal has to be as easy as consent was (GDPR art. 7(3)), which means one
 * click somewhere findable — not an email address, and not buried three modals
 * deep. The cookie policy is where someone goes to look, so it is where the
 * switch lives.
 */
export function ConsentControl() {
    const language = useLanguageStore((s) => s.language);
    const tr = (b: { en: string; fr: string }) => (language === 'fr' ? b.fr : b.en);
    const { analytics, setAnalytics } = useConsentStore();

    const state = analytics === 'granted' ? S.granted : analytics === 'denied' ? S.denied : S.undecided;

    return (
        <section className="mt-12 rounded-2xl border border-white/15 p-5">
            <h2 className="font-display text-2xl font-bold uppercase tracking-[-0.01em]">{tr(S.heading)}</h2>
            <p className="mt-3 leading-relaxed text-white/80">{tr(state)}</p>
            <div className="mt-4">
                {analytics === 'granted' ? (
                    <Button variant="outline" onClick={() => setAnalytics('denied')}>
                        <X className="mr-2 h-4 w-4" aria-hidden="true" />{tr(S.turnOff)}
                    </Button>
                ) : (
                    <Button onClick={() => setAnalytics('granted')}>
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />{tr(S.turnOn)}
                    </Button>
                )}
            </div>
        </section>
    );
}
