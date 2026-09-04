/**
 * Which sports an athlete may see.
 *
 * The app shipped every sport to everyone, so an athlete who signed up for
 * tennis alone still had football and gym cards on their dashboard and two
 * empty football sections in their insights. What someone chose at signup is
 * already on their user document; this is the one place that decides what to
 * do with it.
 *
 * Adding a sport is deliberately not self-service: an athlete reports it and
 * an admin grants it from user management. Admins themselves see everything,
 * because they need to look at any athlete's setup.
 */

export const SHIPPED_SPORTS = ['gym', 'football', 'tennis'] as const;
export type SportId = (typeof SHIPPED_SPORTS)[number];

export function isSportId(value: unknown): value is SportId {
    return typeof value === 'string' && (SHIPPED_SPORTS as readonly string[]).includes(value);
}

interface SportScoped {
    role?: string | null;
    sports?: string[] | null;
}

/**
 * An empty or missing list means "never chosen", not "chose nothing".
 *
 * Every account created before the choice was recorded has no list, and
 * hiding every sport from them would be a worse answer than showing all of
 * them. Once a list exists it is respected exactly.
 */
export function visibleSports(user: SportScoped | null | undefined): SportId[] {
    if (!user) return [...SHIPPED_SPORTS];
    if (user.role === 'admin') return [...SHIPPED_SPORTS];

    const chosen = (user.sports ?? []).filter(isSportId);
    return chosen.length > 0 ? chosen : [...SHIPPED_SPORTS];
}

export function canSeeSport(user: SportScoped | null | undefined, sport: SportId): boolean {
    return visibleSports(user).includes(sport);
}

/** True when the athlete's own choice is what is limiting them. */
export function hasSportRestriction(user: SportScoped | null | undefined): boolean {
    if (!user || user.role === 'admin') return false;
    const chosen = (user.sports ?? []).filter(isSportId);
    return chosen.length > 0 && chosen.length < SHIPPED_SPORTS.length;
}
