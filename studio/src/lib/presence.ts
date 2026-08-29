import type { Timestamp } from 'firebase/firestore';

/**
 * Presence, derived from a heartbeat rather than a flag.
 *
 * A boolean "isOnline" written at sign-in and cleared at sign-out is wrong the
 * moment a tab is closed by crash, by killing the app, or by losing signal —
 * the flag stays true for ever. A timestamp refreshed while the app is open
 * cannot get stuck: it simply goes stale.
 */

/** Heartbeat interval. Frequent enough to look live, rare enough to be cheap. */
export const PRESENCE_HEARTBEAT_MS = 60_000;

/**
 * How long after the last heartbeat someone still counts as online.
 *
 * Comfortably more than two heartbeats, so a single missed write — a sleeping
 * tab, a lost second of network — does not blink someone offline.
 */
export const PRESENCE_STALE_MS = 150_000;

/** Firestore Timestamp, a Date, or nothing at all. */
type SeenAt = Timestamp | Date | { seconds: number } | null | undefined;

function toMillis(value: SeenAt): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as { seconds?: number }).seconds === 'number') {
    return (value as { seconds: number }).seconds * 1000;
  }
  return null;
}

/** Has this account sent a heartbeat recently enough to be considered online? */
export function isOnline(lastSeenAt: SeenAt): boolean {
  const ms = toMillis(lastSeenAt);
  if (ms === null) return false;
  return Date.now() - ms < PRESENCE_STALE_MS;
}

/** Milliseconds since the last heartbeat, or null when never seen. */
export function millisSinceSeen(lastSeenAt: SeenAt): number | null {
  const ms = toMillis(lastSeenAt);
  return ms === null ? null : Date.now() - ms;
}
