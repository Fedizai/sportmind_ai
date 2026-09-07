'use client';

import { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled, type Analytics } from 'firebase/analytics';
import { app } from '@/lib/firebase';

/**
 * Firebase Analytics, loaded only after the visitor has said yes.
 *
 * The import is dynamic and the SDK is never initialised until consent is
 * granted, which is the part that matters: a measurement script that loads and
 * then "waits" has already set its identifiers and already seen the IP address.
 * Under the ePrivacy rules the storage happens at load, not at first event.
 *
 * `isSupported()` because Analytics needs IndexedDB and a browser context, and
 * throws rather than degrades in a private window or an unsupported one.
 */
let instance: Analytics | null = null;

export async function startAnalytics(): Promise<void> {
    if (instance || typeof window === 'undefined') return;
    try {
        if (!(await isSupported())) return;
        instance = getAnalytics(app);
        setAnalyticsCollectionEnabled(instance, true);
    } catch {
        // Blocked by an extension, a private window, or an unsupported browser.
        // Measurement is never worth breaking a page over.
        instance = null;
    }
}

/** Turn collection off in place, for a visitor who changes their mind mid-visit. */
export function stopAnalytics(): void {
    if (!instance) return;
    try { setAnalyticsCollectionEnabled(instance, false); } catch { /* as above */ }
}

export function track(event: string, params?: Record<string, unknown>): void {
    if (!instance) return;
    try { logEvent(instance, event, params); } catch { /* as above */ }
}
