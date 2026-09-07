/**
 * The canonical origin, in one place.
 *
 * Every absolute URL the site emits — canonical tags, Open Graph, the sitemap,
 * robots.txt — has to agree, or search engines index one host and share
 * previews from another. Overridable so a staging deploy does not advertise
 * production as its canonical.
 */
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://sportmind-live--sportmind-ai-lo721.europe-west4.hosted.app';

export const SITE_NAME = 'SportMind AI';

export const SITE_DESCRIPTION = {
    en: 'Log your training, nutrition and body measurements, and get a plan that rewrites itself as you change. Built for athletes and the coaches who run them.',
    fr: 'Enregistrez vos entraînements, votre nutrition et vos mensurations, et obtenez un plan qui se réécrit à mesure que vous évoluez. Pour les athlètes et les entraîneurs qui les encadrent.',
};

/** Pages a search engine should see. Everything behind a login is excluded. */
export const PUBLIC_ROUTES = [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/signup', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/login', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/refunds', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal-notice', priority: 0.3, changeFrequency: 'yearly' as const },
];
