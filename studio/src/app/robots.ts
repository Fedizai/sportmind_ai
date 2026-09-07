import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Keep crawlers out of everything that needs an account.
 *
 * `/dashboard`, `/coach` and `/admin` are behind authentication, so a crawler
 * gets a redirect or an empty shell — pages that are worthless in an index and
 * that waste the crawl budget the public pages need. `/api` is disallowed for
 * the same reason.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/dashboard/', '/coach/', '/admin/', '/onboarding/'],
        }],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
