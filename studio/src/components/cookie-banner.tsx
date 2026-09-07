'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConsentStore } from '@/stores/consent-store';
import { useLanguageStore } from '@/stores/language-store';
import { startAnalytics, stopAnalytics } from '@/lib/analytics';

const S = {
    title: { en: 'Help us see what works', fr: 'Aidez-nous à voir ce qui marche' },
    body: {
        en: 'We would like to measure which pages get used, with Google Analytics. It sets cookies and sees your IP address. Say no and the app works exactly the same — nothing here depends on it.',
        fr: 'Nous aimerions mesurer quelles pages sont utilisées, avec Google Analytics. Cela dépose des cookies et expose votre adresse IP. Refusez et l’application fonctionne exactement pareil — rien ici n’en dépend.',
    },
    accept: { en: 'Accept', fr: 'Accepter' },
    refuse: { en: 'Refuse', fr: 'Refuser' },
    more: { en: 'What is stored', fr: 'Ce qui est stocké' },
} as const;

/**
 * The measurement banner.
 *
 * Three rules it has to satisfy, and each one is visible in the markup:
 *
 * - **Refusing is exactly as easy as accepting.** Same size, same weight, same
 *   row, one click each. A greyed-out "manage preferences" next to a large
 *   "accept all" is the pattern regulators have been fining, and it is the one
 *   thing about a banner that people reliably notice.
 * - **Nothing loads before a choice.** Analytics is imported and initialised in
 *   the accept handler, not on mount and gated afterwards. A script that loads
 *   and then waits has already stored its identifier.
 * - **No dark pattern on dismissal.** There is no close cross that counts as
 *   consent; the banner stays until one of the two buttons is pressed, and both
 *   are real answers.
 *
 * It renders nothing at all until mounted, because the choice lives in
 * `localStorage` and a server render cannot know it — showing the banner and
 * then hiding it would be a flash on every page load for people who already
 * answered.
 */
export function CookieBanner() {
    const language = useLanguageStore((s) => s.language);
    const tr = (b: { en: string; fr: string }) => (language === 'fr' ? b.fr : b.en);
    const { analytics, setAnalytics } = useConsentStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Someone who accepted on an earlier visit gets analytics without being
    // asked again; someone who refused never loads it.
    useEffect(() => {
        if (!mounted) return;
        if (analytics === 'granted') void startAnalytics();
        else stopAnalytics();
    }, [mounted, analytics]);

    if (!mounted || analytics !== null) return null;

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="cookie-banner-title"
            className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-2xl rounded-2xl border border-white/15 bg-[#0d1117]/95 p-5 text-white shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6"
        >
            <div className="flex items-start gap-3">
                <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                    <p id="cookie-banner-title" className="font-semibold">{tr(S.title)}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/75">{tr(S.body)}</p>
                </div>
            </div>

            {/* Both answers, same weight, same row. */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button className="min-w-[7.5rem] flex-1 sm:flex-none" onClick={() => setAnalytics('granted')}>
                    {tr(S.accept)}
                </Button>
                <Button variant="outline" className="min-w-[7.5rem] flex-1 sm:flex-none" onClick={() => setAnalytics('denied')}>
                    {tr(S.refuse)}
                </Button>
                <Link
                    href="/cookies"
                    className="text-sm text-white/70 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {tr(S.more)}
                </Link>
            </div>
        </div>
    );
}
