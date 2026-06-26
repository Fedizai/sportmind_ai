
'use client';

import { useLanguageStore } from '@/stores/language-store';
import { t as translate, type TranslationKey } from '@/lib/i18n';
import { useCallback } from 'react';

/**
 * A hook that provides a reactive translation function `t`.
 * Components using this hook will re-render when the language changes.
 * @returns An object with the translation function `t` and the current `language`.
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  // By using useCallback and depending on the language from the store,
  // we ensure that components using this hook will get a new `t` function
  // and re-render only when the language actually changes.
  const t = useCallback(
    (key: TranslationKey, options?: Record<string, string | number>) => {
      // The actual translation logic is now in the non-hook `translate` function.
      return translate(language, key, options);
    },
    [language] 
  );

  return { t, language };
}
