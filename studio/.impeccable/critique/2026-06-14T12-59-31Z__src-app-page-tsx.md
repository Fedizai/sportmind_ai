---
target: landing
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-14T12-59-31Z
slug: src-app-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sticky header hide/show works; spinner on hero load; minor gaps on theme toggle feedback |
| 2 | Match Between System and Real World | 2 | **Mixed-language bug**: hero/header translated to FR, but Features/How It Works/Pricing/Footer are hardcoded English |
| 3 | User Control and Freedom | 3 | Feature dialog closes cleanly, nav anchors work, no dead ends |
| 4 | Consistency and Standards | 3 | Card/button styling and spacing rhythm consistent throughout |
| 5 | Error Prevention | 3 | Newsletter form lacks client-side validation, but low-stakes |
| 6 | Recognition Rather Than Recall | 3 | Sticky nav keeps Features/Pricing/Login always visible |
| 7 | Flexibility and Efficiency | 2 | No shortcut beyond nav anchors; CTA always routes through signup for anonymous users |
| 8 | Aesthetic and Minimalist Design | 3 | Clean overall, but desktop has a 73px horizontal overflow and body copy runs ~106 chars/line (target <80) |
| 9 | Error Recovery | 2 | "Account Required" toast is good, but no inline validation states elsewhere |
| 10 | Help and Documentation | 1 | No FAQ, no pricing-tier rationale, no tooltips explaining the value ladder |
| **Total** | | **25/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment**: The page mostly avoids the obvious AI-slop tells — no decorative gradient text, no uniform card-wall, no tiny uppercase eyebrows above every section, and the "01/02/03" How It Works sequence is a genuine literal 3-step flow (earned, not scaffolding). The hero's real sports video and disciplined single-accent-color system (Charge Blue only) are above-average signals of intent.

However, the **aesthetic lane is "dark SaaS template with sports footage bolted on"**, not the "Performance Cockpit" HUD the brand brief calls for. Rounded `rounded-2xl` cards, centered hero copy with two centered CTAs, blurred glow orbs, generic Lucide icons in soft rounded squares, and a textbook 3-tier pricing grid with a raised "Most popular" middle card are the default shadcn/Tailwind dark-SaaS playbook — visually indistinguishable from countless other AI-generated startup pages. The phone mockup graphic (`tw_iph.png`) reads as a low-effort wireframe placeholder rather than a real product shot, which undercuts the "premium athletic tool" promise at the one moment the page tries to show the product.

**Deterministic scan** (`detect.mjs --json src/app/page.tsx`, exit 0): returned `[]` — no static findings against the source file in isolation.

**Live browser overlay** (injected successfully into the running page): **6 anti-patterns found**, of 4 distinct rule types:
- `dark-glow` — flagged the Charge Blue glow on primary CTA buttons (`btn-primary-3d`, `glow-primary`, `glow-primary-sm`). **False positive for this brand**: per DESIGN.md's "Glow-Is-Status Rule," a Charge Blue glow on the primary CTA is the deliberate, sanctioned signal for "primary action" — this is the system working as designed, not drift.
- `single-font` — flagged `font-sans` / Public Sans as "only font used." **False positive for this brand**: the "One-Face Rule" deliberately uses one family throughout. Not an issue here.
- `line-length` — flagged a `<p class="text-muted-foreground">` body paragraph at ~106 chars/line (target <80). **Real issue** — corroborates Heuristic #8 above.
- `skipped-heading` — `<h2>` "Pricing plans for every goal" is followed directly by `<h4>` "Product" in the footer, skipping `<h3>`. **Real issue** — a semantic/accessibility gap.

Additionally, direct browser measurement found **horizontal overflow at desktop**: `document.scrollWidth` (1513px) exceeds `window.innerWidth` (1440px) by 73px — something is bleeding past the viewport edge.

## Overall Impression

This is a competent, restrained dark-mode SaaS landing page that does several things right (real video hero, single-accent color discipline, an earned numbered sequence) but does not deliver the brand's stated differentiator — the "Performance Cockpit" HUD feel that's supposed to separate SportMind AI from generic fitness/SaaS competitors. Strip the hero video and this could be any dark SaaS template. The biggest opportunity is to push the instrument-panel identity into at least one more section (a data-readout strip, sharper geometry, a real high-fidelity app screenshot) so the brand POV survives past the first fold — combined with fixing the mixed-language content gap, which is a first-impression trust problem for French-speaking visitors.

## What's Working

1. **Real sports video hero with proper contrast handling** — the vignette gradient and ambient glow orbs keep text legible against moving footage in both themes; this is the single biggest "not a template" signal on the page.
2. **Disciplined single-accent-color system** — Charge Blue is the only signal color across CTAs, icons, and the "Most popular" badge; no rainbow gradients or stray accent colors, which is rarer than it should be in AI-generated landing pages.
3. **Bento feature grid + click-to-expand modal** — varied card spans (one 2-col flagship, one 3-col full-width, four 1-col) avoid the "identical card wall" trap, and the modal is a clean progressive-disclosure pattern for the longer feature descriptions.

## Priority Issues

- **[P1] Mixed-language landing page when French is selected**
  - **Why it matters**: The header nav and hero are fully translated (`t('login')`, `t('heroTitle')`, `t('heroSubtitle')`, `t('getStarted')`), but every section below — Features, How It Works, Pricing, and the entire Footer — is hardcoded English (`page.tsx` lines ~368-606). A French-speaking visitor sees "Connexion" in the header and "Atteignez Votre Plein Potentiel" in the hero, then drops into raw English for the rest of the page. At a first-impression surface, this reads as unfinished/broken and erodes trust before the visitor reaches pricing.
  - **Fix**: Route all section copy (feature titles/descriptions, "How It Works" steps, pricing tier descriptions/feature bullets, footer link labels and newsletter copy) through `useTranslation()` / `t()` keys in `src/lib/i18n.ts`, following the existing pattern for `heroTitle`/`heroSubtitle`/`getStarted`/`login`.
  - **Suggested command**: `/impeccable harden` (i18n completeness is an edge-case/production-readiness gap)

- **[P1] Page doesn't deliver the "Performance Cockpit" brand brief**
  - **Why it matters**: PRODUCT.md positions SportMind AI against Whoop/Strava Pro — a HUD/instrument-panel feel. The landing page instead reads as generic dark-SaaS: `rounded-2xl` soft cards, centered hero with blurred orbs, generic Lucide icons in `bg-primary/10` squares, and a textbook 3-tier pricing grid. The one moment the page tries to "show the product" — the phone mockup in How It Works — is a small (470×394px), aspect-mismatched (`width={420} height={840}` declared vs. actual), flat-grey placeholder-looking graphic with a generic body-map icon, which actively undercuts the premium positioning.
  - **Fix**: Introduce at least one section with telemetry-style framing — sharper corner radii or angular cuts in that section, a live-feeling data-readout strip with monospace figures, or a thin scanline/grid texture — to anchor the cockpit identity beyond the hero video. Replace `tw_iph.png` with a real high-fidelity screenshot of the SportMind dashboard (e.g. the Insights grid), sized and cropped to its actual aspect ratio.
  - **Suggested command**: `/impeccable bolder` (the page is currently too safe/generic relative to the brand's stated ambition), followed by `/impeccable colorize` or `/impeccable layout` if the telemetry-strip approach needs visual-system support

- **[P1] Hero CTA may sit below the fold on mobile**
  - **Why it matters**: At 390px width with the French subtitle wrapping to ~5 lines, the `min-h-[calc(100svh-4rem)]` hero plus `space-y-7` vertical stacking pushes the primary "Commencer"/"Explore features" CTA row toward or past the bottom of an iPhone-sized viewport. On the highest-intent, most mobile-heavy surface, the primary conversion action should never require a scroll.
  - **Fix**: Shorten the hero subtitle on narrow viewports (e.g. a `sm:hidden` short version vs. a longer `hidden sm:block` version), or tighten `space-y-7` / hero `min-h` at the `sm` breakpoint so the CTA row stays within the first viewport.
  - **Suggested command**: `/impeccable adapt`

- **[P2] Horizontal overflow at desktop (73px)**
  - **Why it matters**: `document.scrollWidth` (1513px) exceeds `window.innerWidth` (1440px), meaning some element bleeds past the viewport edge at desktop widths — likely an unconstrained absolutely-positioned glow orb or the video element. This can introduce an unwanted horizontal scrollbar or clipped content depending on browser/OS.
  - **Fix**: Audit the `aria-hidden` ambient glow-orb `div`s (`-left-32`, `right-[-10%]`, etc.) and the full-bleed hero `<video>` for missing `overflow-hidden` on a parent container; constrain with `overflow-x-hidden` on the outermost wrapper if a specific offender can't be isolated quickly.
  - **Suggested command**: `/impeccable audit`

- **[P2] Footer ends the page on its weakest, most generic note**
  - **Why it matters**: Per the peak-end rule, the last thing a visitor sees should reinforce the brand's value. Instead, the page ends on a generic 4-column link directory (Product/Company/Legal/Newsletter) — and there is **zero social proof** (no testimonials, logos, or stats) anywhere on the entire page. After Pricing, the energy just stops.
  - **Fix**: Add a final CTA band above the footer ("Ready to train smarter? Get started") and consider a lightweight testimonial or stats strip before Pricing or the footer to close on a higher note.
  - **Suggested command**: `/impeccable delight`

## Persona Red Flags

**Jordan (Confused First-Timer)**: Understands "AI + athletes" within 5 seconds from the hero. But if browsing in French, hits the EN/FR inconsistency described above the moment they scroll past the hero — "Features" section is suddenly in English with no warning. Reads as a broken/incomplete product, which is the worst possible signal for someone deciding whether to trust this with their training data.

**Riley (Deliberate Stress Tester)**: Confirmed the EN/FR toggle produces a genuinely mixed-language page (not just a perception — verified in source). Fast-scroll and resize behavior held up fine (animations don't re-trigger oddly, video handles `object-cover` resizing). Light/dark toggle could not be confirmed to visibly change the page in this session — worth a direct manual check, since a non-functional theme toggle on a "dark-first, light-compatible" brand would be a P1 on its own if confirmed.

**Casey (Distracted Mobile User)**: Hero heading wraps cleanly with no text overflow (`text-balance` works), but as noted in Priority Issues, the primary CTA risks falling below the fold once the long FR subtitle is factored in. Header icon buttons (theme/language toggles, `size="icon"` ≈36-40px) are slightly under the 44px touch-target guideline, though they're hidden behind the mobile hamburger menu where dropdown items have more generous padding.

## Minor Observations

- **Skipped heading level**: Footer's `<h4>Product</h4>` follows the Pricing section's `<h2>`, skipping `<h3>` — a small semantic/accessibility gap (heading hierarchy should be sequential for screen-reader users).
- **Pricing tier value ladder is non-obvious**: Coach ($50) sits between Athlete ($40) and Pro ($60) by price, but Coach's description says it includes "All Pro Features" plus team management — a visitor may wonder why Coach costs less than Pro despite including more. A one-line clarifying note or reordering would remove the hesitation.
- **Console noise on landing-page load**: Firebase `permission-denied` errors (nutrition logs, streak calculation, snapshot listener) and a missing-translation warning for `"musculation"` fire even on the anonymous landing page — likely from hooks that assume an authenticated context. Not visually apparent to users, but worth cleaning up as part of a hardening pass.
- **`next/image` warning**: `/my_logo.png` uses `fill` without a `sizes` prop, triggering a Next.js optimization warning.
