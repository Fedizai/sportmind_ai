'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/language-store';

/**
 * Keep `<html lang>` truthful.
 *
 * It was hard-coded to "en" while the app's default content is French and the
 * header offers a toggle. A wrong `lang` is not a cosmetic bug: a screen reader
 * picks its voice and its pronunciation rules from it, so every French page was
 * being read aloud by an English synthesiser. It also decides which hyphenation
 * and quotation rules the browser applies, and it is WCAG 3.1.1 at level A.
 *
 * Set from the client because the language lives in a persisted store the
 * server cannot see.
 */
export function HtmlLang() {
    const language = useLanguageStore((s) => s.language);
    useEffect(() => {
        document.documentElement.lang = language === 'fr' ? 'fr' : 'en';
    }, [language]);
    return null;
}
