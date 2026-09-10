'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * One reduced-motion answer for every animation in the app.
 *
 * The CSS side of this is handled in globals.css, but Framer Motion animates
 * in JavaScript and never reads those rules — so until now an athlete who had
 * asked their system for less motion still got every card sliding up the
 * dashboard. `reducedMotion="user"` makes Framer drop transform and layout
 * animations when that preference is set and keep the opacity ones, which is
 * the same trade the stylesheet makes: the information stays, the travel goes.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
