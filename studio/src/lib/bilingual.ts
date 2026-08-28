/**
 * Minimal bilingual string helper.
 *
 * Kept in its own module so components that only need `pick()` (the streak
 * pill, for one) don't pull the entire sport-config exercise library into the
 * client bundle just to read a label.
 */
export type Lang = 'en' | 'fr';

/** A string that exists in both supported languages. */
export type Bi = { en: string; fr: string };

export function pick(value: Bi, lang: Lang): string {
  return value[lang] ?? value.en;
}
