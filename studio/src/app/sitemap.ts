import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, SITE_URL } from '@/lib/site';

/** Only the pages a signed-out visitor can actually reach. */
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return PUBLIC_ROUTES.map((route) => ({
        url: `${SITE_URL}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
