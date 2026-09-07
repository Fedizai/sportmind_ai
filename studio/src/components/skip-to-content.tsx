'use client';

import { useLanguageStore } from '@/stores/language-store';

/**
 * The first thing a keyboard reaches on every page.
 *
 * Without it, tabbing into any page means walking the whole header — logo,
 * every nav link, the language toggle, two buttons — before reaching the
 * content, on every single navigation. WCAG 2.4.1. Visually hidden until it
 * takes focus, at which point it has to be plainly visible, which is why this
 * uses `sr-only focus:not-sr-only` rather than `opacity-0`: an element with
 * zero opacity is still invisible when focused.
 */
export function SkipToContent() {
    const language = useLanguageStore((s) => s.language);
    return (
        <a
            href="#main"
            className="sr-only rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
        >
            {language === 'fr' ? 'Aller au contenu principal' : 'Skip to main content'}
        </a>
    );
}
