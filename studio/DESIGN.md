---
name: SportMind AI
description: Dark-first AI sports performance platform for athletes and coaches
colors:
  background-void: "#060810"
  surface-panel: "#0d1117"
  surface-raised: "#1a1d28"
  charge-blue: "#468af6"
  charge-blue-glow: "#3b82f6"
  glow-violet: "#a78bfa"
  foreground: "#f1f5f9"
  muted-foreground: "#8b94a7"
  border-hairline: "#1f222e"
  destructive: "#9d2525"
typography:
  display:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  pill: "9999px"
  lg: "1.25rem"
  md: "1rem"
  sm: "0.75rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.charge-blue}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
  bottom-nav-pill:
    backgroundColor: "{colors.surface-panel}"
    rounded: "{rounded.pill}"
    height: "62px"
---

# Design System: SportMind AI

## 1. Overview

**Creative North Star: "The Performance Cockpit"**

SportMind AI is the athlete's instrument panel: a near-black surface lit only by the glow of its own readouts. Every screen behaves like a heads-up display — dense, precise, built for a quick glance mid-session, but rendered with the polish of a premium device, not a spreadsheet. Charge Blue is the system's primary indicator light: training status, active tabs, primary actions, and AI insight all pulse in the same electric blue. Glass surfaces — the floating bottom nav, overlays — sit like a HUD visor over the cockpit, frosted and responsive to touch.

This system explicitly rejects the **generic SaaS dashboard** (flat gray-on-gray cards, default admin-template chrome, sterile enterprise tone) and **cheap fitness app clutter** (loud gamification badges, mismatched ad-style gradients, busy "free app" energy). Nothing here should look like an internal ops tool, and nothing should look like it's trying to sell you a supplement.

**Key Characteristics:**
- Dark-first (`#060810` void background), light theme is a secondary, fully-supported mode, not the design target.
- One accent color (Charge Blue) carries all interactive/active meaning; Glow Violet is reserved for rare gradient accents only.
- Cards and panels read as physically lifted instrument panels: top-edge shine, soft 3D shadow, subtle inner gradient.
- Floating navigation is true liquid glass (heavy blur + saturation), distinct from the flatter panel surfaces.
- Motion is tactile (press, glow-pulse, spring-snap), never decorative-only.

## 2. Colors

The palette is restrained and dark: one near-black void, one panel surface one step lighter, and a single electric accent that does all the signaling.

### Primary
- **Charge Blue** (`#468af6`, token `hsl(217 91% 62%)`): the one accent. Active nav tab, active states, primary buttons, focus rings, links, AI-assistant highlights. Reserve it for things the user should notice or act on.
- **Charge Blue Glow** (`#3b82f6`): the lower-opacity glow/shadow variant of Charge Blue (`glow-primary`, `glow-pulse` animation) — halo around active/important elements, never a fill color itself.

### Secondary
- **Glow Violet** (`#a78bfa`): used only as the second stop in the `text-gradient` / `text-gradient-blue` utilities (Charge Blue → Glow Violet). Never used as a standalone fill, border, or icon color — gradient-only, and only on short emphasis text (AI feature names, hero numerals).

### Neutral
- **Void** (`#060810`): the base background. Carries a near-invisible radial mesh of Charge Blue / Glow Violet at ~4-7% opacity near the top and right edges — the cockpit's ambient backlight.
- **Panel** (`#0d1117`): card and surface background, one step up from Void.
- **Raised Panel** (`#1a1d28`): secondary/muted surfaces (pills, chips, inactive nav backgrounds) — one step up from Panel.
- **Foreground** (`#f1f5f9`): primary text on dark surfaces.
- **Muted Foreground** (`#8b94a7`): secondary text, captions, inactive labels.
- **Hairline Border** (`#1f222e`): 1px borders/dividers on dark surfaces — always paired with a `rgba(255,255,255,0.05–0.11)` highlight border on glass/panel edges for the "lit edge" effect.

### Named Rules
**The One Signal Rule.** Charge Blue is the only color that means "active / primary / pay attention." If a second accent color appears anywhere outside the Charge Blue → Glow Violet text gradient, it's a mistake — destructive red is the sole sanctioned exception, and only for destructive actions.

**The Lit-Edge Rule.** Every dark panel, card, and glass surface gets a 1px top-edge highlight (`rgba(255,255,255,0.05-0.25)`, full-width or via `inset 0 1px 0`). This is what separates "premium dark UI" from "just a dark div" — never ship a dark surface without it.

## 3. Typography

**Display / Body / Label Font:** Public Sans (with system sans-serif fallback) — a single family throughout, hierarchy carried entirely by weight, size, and letter-spacing.

**Character:** Public Sans is geometric, technical, and unobtrusive — it reads as a precision instrument's typeface, not an editorial one. The Performance Cockpit doesn't need a second voice; one face, used confidently across weights, keeps every screen feeling like the same device.

### Hierarchy
- **Display** (700, `clamp(1.5rem, 4vw, 1.875rem)`, line-height 1.2, letter-spacing -0.02em): Page titles ("Welcome, {name}!"), section headers — the only place bold display weight appears on a dashboard screen.
- **Title** (600, 1.25rem, line-height 1.3): Card titles, modal headers, nav tab labels at desktop size.
- **Body** (400, 0.875rem, line-height 1.5): All standard UI text, descriptions, list items. Cap prose blocks (AI explanations, plan descriptions) at 65-75ch.
- **Label** (500, 0.5625rem, letter-spacing 0.02em): Bottom-nav tab labels and micro-captions only — the smallest text in the system, always paired with an icon, never standalone.

### Named Rules
**The One-Face Rule.** Don't introduce a second font family for "emphasis" or "AI" features. Weight (400/500/600/700) and the Charge Blue→Glow Violet gradient are the system's emphasis tools — a second typeface reads as an unfinished design system, not a deliberate one.

## 4. Elevation

The system is layered, not flat: every surface sits at one of three depths (Void → Panel → Raised Panel), reinforced by soft ambient shadows and lit edges rather than hard drop shadows. Glow is a fourth, separate elevation language reserved for active/important elements — it signals "powered on," not "physically higher."

### Shadow Vocabulary
- **shadow-card** (`inset 0 1px 0 rgba(255,255,255,0.055), 0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.35), 0 16px 40px rgba(0,0,0,0.22)`): default resting elevation for cards and panels. Always paired with the lit top edge.
- **shadow-float** (`inset 0 1px 0 rgba(255,255,255,0.055), 0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.4), 0 32px 64px rgba(0,0,0,0.25)`): floating/overlay elements that sit above the page content (modals, the bottom nav pill's container).
- **shadow-btn / shadow-btn-hover**: primary-button-specific — an inset highlight/shadow pair plus a Charge Blue glow (`0 4px 14px rgba(59,130,246,0.22)` → `0 8px 28px rgba(59,130,246,0.32)` on hover) that intensifies on hover, giving the "powering up" feedback.
- **glow-primary / glow-primary-sm** (`0 0 16px rgba(59,130,246,0.35), 0 0 48px rgba(59,130,246,0.12)`): ambient halo for active states — the active bottom-nav bubble, active AI insight cards, focus indicators.

### Named Rules
**The Glow-Is-Status Rule.** Box-shadow elevation (`shadow-card`/`shadow-float`) communicates physical depth; Charge Blue glow communicates state (active, focused, AI-powered). Never use a Charge Blue glow on a resting/inactive element — it must mean something is on.

## 5. Components

Tactile and confident: controls feel like physical switches and dials on the cockpit panel — they depress, glow, and spring back, never just fade.

### Buttons
- **Shape:** `rounded-xl` (0.75rem / 12px) by default; small variant `rounded-lg` (1rem... project token: `calc(var(--radius) - 4px)` = 1.0625rem).
- **Primary:** Charge Blue fill (`bg-primary`), `btn-primary-3d` treatment — `shadow-btn` at rest, `shadow-btn-hover` on hover (glow intensifies), and `active:scale-[0.97] active:translate-y-px` with an inset shadow on press — a real button press, not just an opacity change.
- **Secondary:** Raised Panel fill (`bg-secondary`) with `shadow-card`, for actions that matter less than primary but more than ghost.
- **Outline / Ghost:** `border border-white/10 bg-white/[0.03] backdrop-blur-sm`, hover raises to `bg-white/[0.07]` — used for tertiary actions and toolbar controls over glass/imagery.
- **Hover / Focus:** all transitions at 200ms; focus-visible gets a 2px Charge Blue ring with offset.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (1rem / 16px).
- **Background:** Panel (`bg-card` = `#0d1117` in dark).
- **Shadow Strategy:** `shadow-card` (see Elevation) plus the Lit-Edge top highlight (`bg-gradient-to-r from-transparent via-white/25 to-transparent`, 1px) and a subtle top-left inner glow (`bg-gradient-to-br from-white/[0.04] via-transparent to-transparent`).
- **Border:** 1px hairline, `border-white/[0.07]` in dark mode.
- **Internal Padding:** 1.5rem (`p-6`) header/content, no top padding on content directly under a header.

### Inputs / Fields
- **Style:** `rounded-xl`, `bg-background/50` (dark: `bg-white/[0.04]`), backdrop-blur, 1px `border-input`.
- **Focus:** border shifts to `border-primary/60`, background brightens slightly, plus a soft Charge Blue focus glow (`0 0 0 3px rgba(59,130,246,0.15), 0 0 12px rgba(59,130,246,0.1)`) — same "powering up" language as buttons.
- **Disabled:** 50% opacity, cursor disabled.

### Navigation
- **Desktop tab bar:** a pill-shaped container (`rounded-full`, `bg-white/[0.04]`, `ring-1 ring-white/[0.08]`, `backdrop-blur-xl`, `shadow-card`) with a sliding indicator pill (`bg-background/90`, `shadow-card`) that animates `width`/`transform` (300ms ease-out) to the active tab.
- **Mobile bottom nav (signature component):** a full-width liquid-glass pill (`.liquid-glass-pill` — `blur(40px) saturate(180%) brightness(1.02)`, `rgba(255,255,255,0.045)` fill in dark, `rgba(255,255,255,0.11)` border, heavy ambient shadow) floating above the safe area. A dynamic-width "bubble" (`.liquid-glass-bubble`) slides and resizes (spring `cubic-bezier(0.34,1.56,0.64,1)`, 0.35s) to hug whichever label is active, including mid-drag via pointer events — icon + label fade from `/35`–`/30` opacity (inactive) to full + Charge Blue icon (active).
- **Default / hover / active states:** inactive icons/labels sit at ~30-35% opacity; active state is full-opacity foreground text with a Charge Blue icon, inside the glass bubble.

### Liquid Glass Pill (signature component)
The floating bottom nav and any future floating toolbars/overlays use this treatment: `backdrop-filter: blur(40px) saturate(180%) brightness(1.02)`, near-transparent white fill (`rgba(255,255,255,0.28)` light / `rgba(255,255,255,0.045)` dark), a bright 1px border, and a soft top-left diagonal gradient sheen (`linear-gradient(155deg, rgba(255,255,255,0.06) 0%, transparent 55%)`). This is the system's one "true glass" surface — reserve it for floating/overlay UI, not for resting page content (which uses Panel surfaces instead).

## 6. Do's and Don'ts

### Do:
- **Do** keep Charge Blue (`#468af6` / glow `#3b82f6`) as the only color that signals "active, primary, or AI-powered" — including focus rings, active nav states, and primary buttons.
- **Do** give every dark panel/card a 1px lit top edge (`rgba(255,255,255,0.05-0.25)`) — this is the line between "premium dark UI" and "a gray div" (the Lit-Edge Rule).
- **Do** use `.liquid-glass-pill` only for floating/overlay elements (bottom nav, future floating toolbars); resting page content stays on Panel (`#0d1117`) surfaces.
- **Do** make primary buttons feel pressed: `active:scale-[0.97] active:translate-y-px` plus an inset shadow on press, glow intensifying on hover.
- **Do** respect `prefers-reduced-motion`: spring/slide/glow-pulse animations need an instant or crossfade fallback (per PRODUCT.md accessibility commitment).
- **Do** keep touch targets ≥44px on mobile, especially the bottom nav and any primary action — athletes use this one-handed mid-workout.

### Don't:
- **Don't** introduce a second accent color outside the Charge Blue → Glow Violet text gradient. Destructive red is the only sanctioned exception, for destructive actions only.
- **Don't** build "generic SaaS dashboard" surfaces — flat gray-on-gray cards, default admin-template chrome, sterile enterprise tone (PRODUCT.md anti-reference).
- **Don't** add "cheap fitness app clutter" — loud gamification badges, mismatched ad-style gradients, busy "free app" energy (PRODUCT.md anti-reference).
- **Don't** use a Charge Blue glow on a resting/inactive element — glow means "on," not "decorative" (the Glow-Is-Status Rule).
- **Don't** introduce a second font family for "emphasis." Public Sans at different weights/sizes, plus the text gradient, are the system's only emphasis tools (the One-Face Rule).
- **Don't** use `border-left`/`border-right` accent stripes on cards or list items — not part of this system's vocabulary.
