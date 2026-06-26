# Product

## Register

product

> SportMind AI also has a marketing landing page (`/`) which is a **brand** surface (hero, pricing, features). The app surfaces (`/dashboard`, `/coach`, `/admin`) are the **product** register and are the default for design work unless a task explicitly targets the landing page.

## Users

- **Athletes** — on mobile, during or right after training. Often one-handed, in a gym or on a field, possibly sweaty or distracted. Need quick glances at workouts, nutrition, and stats without fiddly interactions.
- **Coaches** — on tablet/desktop, planning. More deliberate sessions: managing rosters, building training plans, reviewing video, messaging players.
- **Admins** — desktop-first, managing the platform (user management, billing oversight). Infrequent but needs to be clear and low-risk.

## Product Purpose

SportMind AI is a production SaaS performance platform for athletes and coaches: AI-driven training plans, nutrition plans, video form analysis, tactical advice, and team/coach tooling, gated by subscription tier (Athlete / Pro / Coach). Success looks like athletes returning daily to log training and check insights, and coaches relying on it to plan and communicate with their team without friction.

## Brand Personality

Premium & athletic — confident, sharp, performance-focused. Feels like a high-end sports performance tool (in the spirit of Whoop, Strava Pro, Nike Training Club), not a generic business app. Dark-first with blue/purple glow accents, iOS 26 "liquid glass" surfaces for navigation and floating elements.

## Anti-references

- **Generic SaaS dashboard**: avoid flat gray-on-gray cards, default Bootstrap/Material templates, sterile enterprise/admin-tool energy. Every surface should feel like it belongs to an athletic performance brand, not an internal ops tool.
- **Cheap fitness app clutter**: avoid loud gamification badges, ad-heavy layouts, busy mismatched gradients — that "free app with ads" feel. Keep visual effects (glass, glow) purposeful and restrained.

## Design Principles

1. **Premium athletic, not corporate SaaS** — every screen should read as a performance tool first, a business app never.
2. **One-handed, mid-workout usable** — mobile athlete flows must work with quick glances and thumb-reach interactions; don't bury primary actions.
3. **Liquid glass with restraint** — glass/blur/glow effects (as established in the bottom nav) are a signature, but used purposefully on floating/navigational elements, not decoratively everywhere.
4. **Dark-first, light-compatible** — design and verify in dark mode first (the default theme), then confirm light mode holds up.
5. **Role-appropriate density** — athlete mobile views stay light and glanceable; coach/admin views on tablet/desktop can carry more density and data without feeling cramped.

## Accessibility & Inclusion

WCAG 2.1 AA contrast across both dark and light themes. Respect `prefers-reduced-motion` (crossfade/instant alternatives for spring/slide animations). Minimum 44px touch targets for mobile, especially bottom nav and primary actions, to support one-handed/gym use.
