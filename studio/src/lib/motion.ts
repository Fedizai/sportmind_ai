/**
 * The one motion vocabulary for the product.
 *
 * Apple's *Designing Fluid Interfaces* replaces the physics triplet with two
 * parameters a designer can reason about: **damping ratio** (how much it
 * overshoots) and **response** (how quickly it reaches the target, in
 * seconds — not a duration, since a spring has none). Motion's `bounce` +
 * `duration` spring API maps onto those directly, so the numbers below are
 * the ones Apple ships rather than something invented here.
 *
 * The rule behind the defaults: overshoot is earned. A menu that just faded
 * in has no momentum of its own and bouncing reads as decoration; a card the
 * athlete flicked does, and settling dead-flat reads as stuck. So critically
 * damped everywhere, bounce only after a gesture carried velocity in.
 */

/** Move / reposition. Apple: damping 1.0, response 0.4. */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

/** Anything that should feel immediate — presses, toggles, small chrome. */
export const SPRING_SNAPPY = { type: 'spring', bounce: 0, duration: 0.28 } as const;

/** Drawers and sheets. Apple: damping 0.8, response 0.3. */
export const SPRING_SHEET = { type: 'spring', bounce: 0.18, duration: 0.34 } as const;

/** After a flick or a throw — the only place overshoot belongs. */
export const SPRING_MOMENTUM = { type: 'spring', bounce: 0.22, duration: 0.4 } as const;

/**
 * The reduced-motion counterpart: a short cross-fade.
 *
 * Reduced motion is not "no feedback" — it is the same information without
 * the vestibular part, so opacity stays and travel goes.
 */
export const CROSSFADE = { type: 'tween', duration: 0.16, ease: [0.32, 0.72, 0, 1] } as const;

/**
 * Where a flick would come to rest, so a gesture can be sent to the target
 * nearest its projected endpoint rather than the one nearest the release
 * point. This is the exponential-decay form from Apple's sample code, not the
 * textbook `v²/(2a)` — the two disagree, and this is the one that feels like
 * iOS scrolling.
 *
 * @param initialVelocity px/s at release.
 * @param decelerationRate 0.998 for normal scroll feel, 0.99 for snappier.
 */
export function project(initialVelocity: number, decelerationRate = 0.998): number {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary.
 *
 * A hard stop reads as frozen — as though the app stopped listening. Falling
 * further behind the finger the further past the edge it goes reads as
 * "still listening, but there is nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * The CSS half of the same vocabulary, for the transitions that are not
 * gesture-driven and do not need a spring.
 *
 * The two curves are inverses of one another — control points mirrored
 * through the diagonal — so a surface returns along the path it arrived on
 * instead of easing out one way and in another.
 */
export const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const EASE_IN = 'cubic-bezier(1, 0, 0.68, 0.28)';
