---
target: sports modules, insights, and messages pages
total_score: 20
p0_count: 1
p1_count: 2
timestamp: 2026-06-14T14-34-26Z
slug: sports-modules-insights-and-messages-pages
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Confirmed live on `/dashboard/football?tab=logbook` (mobile): the entire page content (title, tabs, "Historique des Matchs" card, empty state) renders at ~15-20% opacity while a spinner spins indefinitely next to the "SportMind AI" logo — persisted across repeated screenshots. Only the "Enregistrer un Match" button and the bottom nav stay full-opacity. Root cause is almost certainly `PageTransition` (`src/components/page-transition.tsx`), which wraps every page in a Framer Motion `opacity: 0 → 1` over 0.3s inside `AnimatePresence mode="wait"` — if that animation stalls (e.g. on a full reload via `location.href`, or a backgrounded tab), the page is stuck at near-zero opacity with no recovery. |
| 2 | Match Between System / Real World | 3 | French terminology (Aperçu, Entraînement, Journal, Compétences) matches athlete mental models well, but English leaks through in several places (see #4). |
| 3 | User Control and Freedom | 2 | Multi-step match-logging wizard has Back/Next but no jump-to-step or draft save. Switching sports loses tab context. |
| 4 | Consistency and Standards | 1 | Confirmed: Sports hub (`/dashboard/sports`) is 100% hardcoded English ("Select a Sport", "Start Training") while the global nav around it is French. Insights History mixes "Historique des Aperçus" (FR) with "Review your performance data from previous days." and an English date format "June 14th, 2026" in the same header. The dashboard greeting falls back to hardcoded "Bienvenue, Athlete!" (English word "Athlete" inside a French sentence) when `displayName` is empty — and this greeting renders on every page, including Messages, where it's irrelevant. Additionally, two different "pick a sport" card implementations exist with different visual quality. |
| 5 | Error Prevention | 3 | Zod validation throughout, delete actions behind `AlertDialog` confirmations. |
| 6 | Recognition Rather Than Recall | 2 | 6-tab bar with 2 Pro-locked tabs (small lock icon only) requires memorizing which tabs are gated; empty "0" stat blocks give no sense of what good values look like. |
| 7 | Flexibility and Efficiency | 2 | URL-param tab deep-linking is a nice efficiency win, but no keyboard shortcuts, bulk actions, or quick-add from overview. |
| 8 | Aesthetic and Minimalist Design | 3 | Cohesive dark cockpit aesthetic on desktop; Insights stacks repetitive "Passez à Pro" lock cards back-to-back. |
| 9 | Error Recovery | 2 | Toasts exist, but football's video-upload error surfaces a raw dev message ("CORS or permission issue likely. Check storage rules and browser console.") to end users. |
| 10 | Help and Documentation | 1 | No onboarding, tooltips, or contextual help on any of the six surfaces reviewed. |
| **Total** | | **20/40** | **Acceptable (low end)** |

*(Adjusted down from the initial 21/40 after live verification confirmed the opacity/loading bug reproduces reliably and the i18n breaks are more pervasive than a single page.)*

## Anti-Patterns Verdict

**Does this look AI-generated? Mixed.** The underlying design system (`DESIGN.md` "Performance Cockpit") is genuinely considered and NOT a generic AI template — the lit-edge `Card` primitive, glass bottom nav, and Charge Blue accent are implemented consistently. But several content patterns and a real visibility bug undercut the polish:

- **Identical card grid**: `/dashboard/sports/page.tsx` is 6 nearly-identical cards (icon + title + "Start Training" pill button), the textbook AI-grid pattern. The content justifies *a* grid, but these specific cards carry zero differentiation (no stats, no last-activity, no progress) — pure nav tiles dressed as content cards. A second, more refined "pick a sport" grid exists elsewhere in `client.tsx` (icon chip with `glow-primary-sm`) — **two parallel implementations of the same UI, different quality**.
- **Stray accent colors**: win/loss/draw result cards in football and tennis (`getResultClasses()`) use `bg-green-500/10` / `bg-yellow-500/10` / `bg-red-500/10` with matching text colors and a colored top stripe; training-session-type icons use blue/purple/red/gray; the Pro-lock icon is yellow; a "Marquer comme Terminé" button is `bg-green-600`. This directly contradicts the design system's "single accent" / "Charge Blue is the only color that means active/primary" rule — and it's not a one-off, it's baked into a shared helper reused 3+ times per module.
- **Hero-metric-ish block**: the "Récapitulatif de la Semaine" 4-stat row (`grid-cols-2 md:grid-cols-4`, all currently "0") appears identically in football and tennis overviews — inert placeholder data with a clipped label ("Passes Dé." truncated from "Passes Décisives").
- **No `border-left`/stripe abuse** on cards/lists — clean on that specific ban.
- **No gradient-text misuse** — `.text-gradient-blue` is reserved correctly and simply unused on these six surfaces.

**Deterministic scan**: `node detect.mjs --json` across `src/app/dashboard/{sports,football,tennis,basketball,boxing,swimming,insights,messages}` and `src/components/messaging` returned **exit 0, zero findings**. The detector's static rules (eyebrows, numbered markers, gradient text, side-stripes, etc.) genuinely don't fire here — the issues found are about color-system discipline, i18n completeness, and a runtime loading bug, which are outside the detector's static-analysis scope. No false positives to report since there were no findings at all.

**Browser evidence**: Live-verified at 375×812 (mobile) and desktop, `language=fr`, authenticated session:
- Sports hub renders with full contrast once the splash logo clears — header text is correct French → **English** ("Select a Sport") right next to a French bottom nav ("Sports / Statistiques / Admin / Coach / Profil").
- Football `?tab=logbook` on mobile: confirmed the persistent ~15-20%-opacity "stuck transition" state described above, reproduced across multiple screenshots.
- Insights History: confirmed "Historique des Aperçus" (FR heading) + "Review your performance data from previous days." (EN subtitle) + "June 14th, 2026" (EN date format) all in the same header block.
- Messages: confirmed an almost entirely empty page — "Bienvenue, Athlete!" greeting, a "Conversations" panel with only a search box, and then a large empty void with no conversations, no empty-state illustration, and no "no conversations yet" message.

No visual overlay injection was performed (this is a live Next.js dev server via the Preview MCP, not the static `live-server.mjs` flow); the live screenshots/snapshots above serve as the browser evidence instead.

## Overall Impression

The "Performance Cockpit" design system is real and mostly honored — the lit-edge cards, glass nav, and Charge Blue accent give this a genuinely premium dark-UI feel that's rare in AI-generated work. But the six surfaces reviewed here are where the system's discipline breaks down: a confirmed loading/transition bug that can leave entire pages near-invisible, a primary navigation hub (`/dashboard/sports`) that's untranslated, a color system that quietly grew 4-5 unsanctioned accent colors for "wins/losses/categories," and an Insights/Messages experience that's either a paywall wall or an empty void. The single biggest opportunity: fix the page-transition bug (it's the kind of thing that makes the whole app feel broken on first impression) and then bring the sports hub + insights history into the same i18n discipline already achieved on Settings, Coach nav, and Gym (from the prior harden pass).

## What's Working

1. **The lit-edge `Card` primitive is implemented once and inherited everywhere** (`src/components/ui/card.tsx`) — every reviewed surface except the unwrapped "Coming Soon" `<div>` automatically gets the top-edge highlight, inner glow, and shadow stack. This is exactly how a design system should be enforced — centrally, not per-page.
2. **`EmptyInsightCard`** (`insights/history/page.tsx`) turns "no data" into a coherent, reusable visual rhythm: dashed border, hover-to-primary transition, centered icon + message. It's reused across gym/tennis/football empty states and is one of the more "designed" details in the whole review.
3. **URL-driven tab state + Pro-gate interception**: both football and tennis read `?tab=` for deep-linking and intercept tab changes to show an upgrade modal when a Pro tab is selected by a free user — a clean pattern that ties navigation, state, and monetization together without extra chrome.

## Priority Issues

**[P0] Page content can render stuck at near-zero opacity, indefinitely**
- **What**: On `/dashboard/football?tab=logbook` (mobile, 375×812), the entire main content area — title, subtitle, tab bar, and the "Historique des Matchs" card with its fully-rendered empty state — renders at roughly 15-20% opacity against the near-black background, while a spinner next to the logo spins continuously. This persisted across multiple screenshots taken seconds apart; it is not a single animation frame.
- **Why it matters**: This is the athlete-facing, mobile-first product. If a real user hits this state (e.g., after a full page reload, returning from background, or on a slower device where the fade-in stalls), the entire app reads as broken/unreadable — a first-impression killer for Casey (distracted mobile user) and a trust-breaker for anyone evaluating the product.
- **Fix**: Investigate `src/components/page-transition.tsx` — the `AnimatePresence mode="wait"` + `opacity: 0 → 1` (0.3s) wrapper around every page. Ensure content has `opacity: 1` as its non-JS default (progressive enhancement) so a stalled/incomplete animation never leaves real content invisible, and confirm the transition actually completes after `location.href`-style full navigations (which remount the whole tree) vs. client-side route changes.
- **Suggested command**: `/impeccable harden` (then `/impeccable audit` to confirm the fix across breakpoints).

**[P1] `/dashboard/sports` (Sports hub) is hardcoded English in an otherwise-French UI**
- **What**: "Select a Sport", "Choose a module to start logging activities and get insights.", "Start Training", and "View Dashboard" are literal strings in `src/app/dashboard/sports/page.tsx` (lines ~38-41, 67-69), not routed through `useTranslation()`. Live-confirmed: the heading "Select a Sport" sits directly above a French bottom nav ("Sports / Statistiques / Admin / Coach / Profil").
- **Why it matters**: This is the central hub every athlete passes through to reach any sport module — it's high-traffic and high-visibility. Mixed-language primary navigation reads as unfinished and undermines the polish the rest of the system has earned.
- **Fix**: Wire all four strings through `t()`, following the exact pattern already applied to Settings, Coach nav, and Gym in the prior harden pass (add EN/FR key pairs to `src/lib/i18n.ts`, import `useTranslation` in the page).
- **Suggested command**: `/impeccable harden`

**[P1] Win/loss/category colors (green/yellow/red/blue/purple) violate the "single accent" system across Football, Tennis, and Insights History**
- **What**: `getResultClasses()` (reused in football and tennis match-history cards and `HistoricalFootballCard`) applies `bg-green-500/10`/`text-green-400` (win), `bg-yellow-500/10`/`text-yellow-400` (draw/MOTM), `bg-red-500/10`/`text-red-400` (loss) as card backgrounds, text colors, and a colored top stripe. Training-session-type icons separately use blue/purple/red/gray for technical/tactical/physical/other. The Pro-lock icon is yellow, and a "Marquer comme Terminé" button uses `bg-green-600`.
- **Why it matters**: `DESIGN.md`'s "One Signal Rule" is explicit — Charge Blue is the *only* color that means "active/primary/pay attention," with destructive red as the sole sanctioned exception. This pattern introduces 4-5 unsanctioned accents, repeated across the two most fully-built modules — it's systemic, not incidental, and it dilutes the "instrument panel" feel the rest of the system achieves.
- **Fix**: Either formally extend the system with a small, desaturated semantic-status ramp (win/loss/draw + category tags) that still reads as part of the cockpit, or replace color-coding with icon/weight/motion differences (checkmark vs. X, filled vs. outline) so Charge Blue keeps its monopoly on "signal."
- **Suggested command**: `/impeccable colorize`

**[P2] Insights History mixes English and French within the same header and date format**
- **What**: Live-confirmed on `/dashboard/insights/history`: "Historique des Aperçus" (FR heading) sits above "Review your performance data from previous days." (EN subtitle), and the date control reads "June 14th, 2026" (English date format) in a French-locale UI. Empty-state copy elsewhere on the page (per source) mixes "No nutrition data logged for this day" with "La liste de courses est vide !" in the same grid.
- **Why it matters**: This is the worst i18n offender found — nearly every line on this page alternates language. For a French-locale user this is the most visibly "unfinished" surface in the review, right after the Sports hub.
- **Fix**: Audit `src/app/dashboard/insights/history/page.tsx` for every literal string (section subtitles, empty-state copy, date formatting via `date-fns` locale) and route through `t()` + the `fr`/`enUS` `date-fns` locale already imported elsewhere in the codebase (e.g. gym client).
- **Suggested command**: `/impeccable harden`

**[P2] Messages page is an almost-empty void with no guidance**
- **What**: Live-confirmed on `/dashboard/messages`: below the dashboard greeting ("Bienvenue, Athlete!") and a "Conversations" panel containing only a search box, the rest of the viewport (roughly 700px of vertical space on desktop) is empty — no conversation list, no "no conversations yet" message, no illustration, no CTA to start a conversation.
- **Why it matters**: For a player with no coach assigned yet (or a coach with no players yet), this reads as broken rather than "empty by design" — there's no signal of what *would* appear here or how to get there. Also, the "Bienvenue, Athlete!" greeting (with hardcoded English fallback name "Athlete" — `src/app/dashboard/layout.tsx:71`) is irrelevant on a focused messaging task screen.
- **Fix**: Add an empty state to the conversation list/detail pane (reusing the `EmptyInsightCard` dashed-border pattern for visual consistency) explaining why it's empty and what to do next (e.g., "Aucune conversation. Votre coach apparaîtra ici une fois assigné."). Separately, replace the hardcoded "Athlete" fallback with a translated default (`t('athleteDefaultName')` or similar).
- **Suggested command**: `/impeccable onboard` (empty states), with the "Athlete" string fix folded into the next `/impeccable harden` pass.

## Persona Red Flags

**Alex (impatient power user / coach)**
- Lands on `/dashboard/sports`, sees "Select a Sport" in English right after using a fully-French nav — an immediate inconsistency before even picking a module.
- To log a match quickly, Alex must: open Football → click "Journal" (3rd of 6 tabs) → "Enregistrer un Match" → complete a 3-step wizard. No quick-add from the overview, no batch entry for logging multiple players' stats after a session.
- Two of the six football/tennis tabs ("Vidéo", "Coach IA") are Pro-locked behind a tiny `h-3 w-3` lock icon — on a quick scan, Alex may tap into an upgrade-modal interruption rather than content, twice.

**Riley (deliberate stress tester)**
- The football "AI Coach Insight" card and the tennis "Progress Radar" both show static/mocked content regardless of actual logged data (tennis radar values like Serve 80, Forehand 90 never change) — Riley logging real matches would notice the "AI" never updates and flag it as fake.
- Triggering a football video-upload error surfaces a raw developer string ("CORS or permission issue likely. Check storage rules and browser console.") directly in a user-facing toast.
- On `/dashboard/messages`, Riley sees zero conversations and zero explanation — can't tell if this is "no data yet," a permissions issue, or a bug.
- On mobile, navigating to Football's Journal tab produces the stuck-opacity state (P0) — Riley would document this as a reproducible bug with screenshots.

**Casey (distracted mobile user)**
- The P0 stuck-opacity bug hits Casey hardest: a near-invisible page on first load/navigation is exactly the kind of thing that causes an immediate bounce.
- The football/tennis tab bar wraps to 2 rows of 3 on mobile (`grid-cols-3`), with 2 of those 6 tabs being dead-end Pro locks — Casey scrolls past 2 rows of mostly-inactionable tabs before reaching real content.
- The floating AI-chat FAB (`fixed bottom-20 right-4 h-14 w-14`) sits close to the glass bottom nav, which itself shows/hides on scroll — potential overlap or awkward floating when the nav auto-hides.

## Minor Observations

- Two different "pick a sport" card implementations exist (`/dashboard/sports/page.tsx` vs. the sports grid inside `client.tsx`) with different visual quality — worth consolidating to one canonical version.
- The Insights dashboard stacks 2-3 visually-identical "Passez à Pro / pour débloquer cet aperçu" lock cards back-to-back in the Gym section — for a free-tier athlete, the "insights" payoff screen becomes a wall of paywalls before showing anything free.
- The "Coming Soon" placeholder (basketball/boxing/swimming, shared template) sits in a plain `<div className="border-2 border-dashed border-muted">`, not a `Card` — the one surface in this review without the lit-edge treatment. Its copy ("Coming Soon!", "Basketball-specific features are under development. Check back soon!") is also hardcoded English.
- The tennis "Stopwatch" (`font-mono text-5xl`) is functionally fine but visually generic compared to the rest of the cockpit aesthetic — could lean into a "telemetry" framing given the brief literally calls this a "Performance Cockpit."
- The Insights History date navigation correctly disables "next day" when `selectedDate` is today — a small but real error-prevention win.
- `EmptyInsightCard`'s `isRectangle` prop is an inverted-boolean API (not user-facing, but worth noting for future maintainers).

## Questions to Consider

1. If `/dashboard/sports/page.tsx` and the sports grid inside `client.tsx` are two implementations of the same "pick a sport" UI with different quality — which is canonical, and should the other be deleted?
2. The design system says "single accent, no second accent colors" — but win/loss is a core athletic concept that *wants* green/red. Is the rule wrong for this domain, or is the implementation wrong for not finding a Charge-Blue-compatible way to express win/loss (icons, weight, motion) instead of reaching for `green-500`/`red-500`?
3. Given the AI Coach Insight cards and tennis Progress Radar are currently static/mocked, what's the rollout plan for making them real — and should they be visually marked "preview" until then, so stress-testers don't lose trust the moment the data never moves?
