---
target: dashboard and coach hubs
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-14T13-39-50Z
slug: dashboard-and-coach-hubs
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Empty states are well-handled (streak, nutrition, coach cards all show clear "no data yet" copy); no save-confirmation toast visible on Settings' "Save All Changes" |
| 2 | Match Between System and Real World | 1 | **Severe mixed-language problem**: Settings page is 100% English, Coach section nav is 100% English, Gym module tabs are 100% English — all while the rest of the app (dashboard home, insights, coach dashboard body) is in French |
| 3 | User Control and Freedom | 3 | Clear "← Retour au tableau de bord" back link on sport modules; bottom nav lets users jump anywhere |
| 4 | Consistency and Standards | 1 | Same bottom-nav-bubble component is copy-pasted between `dashboard/layout.tsx` and `coach/layout.tsx` with identical bounce-easing code; sport names ("Boxing", "Swimming") aren't localized while sibling labels are |
| 5 | Error Prevention | 2 | "Delete Account" sits as a plain button in Settings with no visible inline warning copy; no client-side validation visible on profile fields |
| 6 | Recognition Rather Than Recall | 3 | Icon+label bottom nav, active-tab pill indicator, and breadcrumb-style back links all aid orientation |
| 7 | Flexibility and Efficiency | 3 | The swipeable bottom-nav bubble (drag to switch tabs) is a genuinely nice power-user touch; tab tracking 60fps via refs is well engineered |
| 8 | Aesthetic and Minimalist Design | 3 | Dark "Performance Cockpit" theme holds up well across dashboard, insights, and coach views; empty states avoid clutter |
| 9 | Error Recovery | 2 | Not deeply testable without triggering real errors, but no visible inline validation/error patterns on Settings forms |
| 10 | Help and Documentation | 1 | No tooltips, help links, or contextual guidance anywhere in the dashboard or coach hub |
| **Total** | | **22/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment**: Visually, this doesn't read as generic AI slop — the "Performance Cockpit" dark theme, liquid-glass bottom nav with spring-following bubble, and tab-pill indicators show real design intent and engineering care (the swipe-to-switch bottom nav in particular is above-average craft). The empty states ("Aucune séance à venir n'est programmée", "Sélectionnez un exercice pour commencer") are specific and on-brand rather than generic "No data" placeholders.

However, the **language inconsistency is now the dominant problem of the entire authenticated app**, not just the landing page. A French-speaking user (the default in this session) sees: a fully-French Dashboard home and Insights page, then hits a **100% English Settings page** ("Settings", "Account Settings", "App Preferences", "Notifications & Privacy", "Data Management", "Billing & Subscription", "Save All Changes"), a **100% English Coach navigation** ("Dashboard / Sports / Messages / Player" tabs sitting directly above a French-language "Tableau de Bord Coach" heading), and a **Gym module whose tabs are entirely English** ("Workout Logger", "Gym Plus", "Progress", "Activities", "Nutrition Calculator", "Video Review", "Select Body Part", "No Exercise Selected") under a French page title ("Module Salle de Sport"). This is a far more damaging version of the issue already fixed on the landing page, because these are the screens paying users live in every day, not a first-impression marketing page.

**Deterministic scan** (`detect.mjs --json src/app/dashboard src/app/coach`, exit 2): 5 findings, all `warning` severity, all in navigation code:
- `bounce-easing` (×2 in `dashboard/layout.tsx:210,321`, ×2 in `coach/layout.tsx:151,292`): the bottom-nav bubble's `cubic-bezier(0.34, 1.56, 0.64, 1)` spring curve overshoots before settling — this violates the design system's "no bounce/elastic" rule, though it's a deliberate iOS-style "settle into place" affordance for a small 46px element, so the user-facing impact is debatable.
- `layout-transition` (×2, `dashboard/layout.tsx:321`, `coach/layout.tsx:292`): the same bubble animates `width` (a layout property) alongside `left`. For a tiny pill this is unlikely to cause visible jank, but it's the textbook case the rule exists for.

Both findings point to the **same block of code duplicated verbatim** between the two layout files — a maintenance/consistency smell independent of whether the easing itself is kept.

**Browser evidence**: Collected via direct navigation + accessibility-tree snapshots across `/dashboard`, `/dashboard/insights`, `/dashboard/settings`, `/dashboard/gym`, and `/coach/dashboard` (all in an authenticated session with `language=fr`). No live-overlay injection was run across this many routes; findings below come from snapshots and screenshots of the live, authenticated app.

## Overall Impression

The underlying interaction design is solid — the liquid-glass bottom nav with the spring-following active bubble, the empty-state copywriting, and the dark cockpit aesthetic all show real craft and consistency *within* a page. But the **i18n harden pass that fixed the landing page didn't reach the product the landing page sells**. Settings, the Coach portal's entire navigation, and at least one sport module (Gym) are hardcoded English inside a French UI. For a bilingual product, this is the single biggest trust/quality signal a user encounters after signing up — worse than on the landing page, because it happens *after* the user has committed (signed up, possibly paid), and Settings/Billing is exactly where users go when something feels wrong.

## What's Working

1. **Liquid-glass bottom navigation with spring-following bubble** (`dashboard/layout.tsx`, `coach/layout.tsx`) — drag-to-switch gesture handling, 60fps-via-refs implementation, and the iOS-style "settle" animation are genuinely well-built and feel premium.
2. **Empty states are specific and on-voice** — "Aucune séance à venir n'est programmée", "Aucun joueur actuellement signalé", "Sélectionnez un exercice pour commencer" — these read like a finished product, not a placeholder.
3. **Dashboard home and Insights pages are fully and correctly localized** — proving the i18n pattern works well when applied; it's a coverage gap, not a pattern problem.

## Priority Issues

- **[P1] Settings page is 100% untranslated English**
  - **Why it matters**: `/dashboard/settings` is one of the most-visited pages in any app (account, billing, security, notifications) and every single string — "Settings", "Account Settings", "Change Password", "Two-Factor Authentication", "Notifications & Privacy", "Data Management", "Delete Account", "Billing & Subscription", "Save All Changes" — is hardcoded English while the rest of the dashboard is French. For French users this is the moment the product feels broken or abandoned, right when they're managing billing or security.
  - **Fix**: Route every label, description, switch label, and button in `src/app/dashboard/settings/page.tsx` (and the related `email`/`password`/`security`/`subscription` sub-pages) through `useTranslation()`/`t()`, adding new EN/FR keys to `src/lib/i18n.ts` following the established pattern.
  - **Suggested command**: `/impeccable harden src/app/dashboard/settings`

- **[P1] Coach section navigation is hardcoded English while page content is French**
  - **Why it matters**: `src/app/coach/layout.tsx` defines `navItems`/`bottomNavItems` with literal strings `"Dashboard"`, `"Sports"`, `"Messages"`, `"Player"` (lines 23-34) and never uses the `t` it imports (line 41 `const { t } = useTranslation();` is unused). The result: a coach sees an English tab bar ("Dashboard / Sports / Messages") sitting directly above a French heading ("Tableau de Bord Coach") and French empty-state cards. This is the exact "header in one language, body in another" pattern already flagged and fixed on the landing page — but it's back, in the Coach portal's primary navigation.
  - **Fix**: Replace the literal `label` strings in both `navItems` and `bottomNavItems` with `t('coachNavDashboard')`, `t('sports')`, `t('messages')`, `t('playerView')` etc., reusing existing dashboard-layout keys (`t('sports')`, `t('messages')`) where the concept matches.
  - **Suggested command**: `/impeccable harden src/app/coach/layout.tsx`

- **[P1] Gym module tabs and workout-logging UI are entirely English**
  - **Why it matters**: `/dashboard/gym` shows a French heading ("Module Salle de Sport") but the sub-tab bar — "Workout Logger", "Gym Plus", "Progress", "Activities", "Nutrition Calculator", "Video Review" — and the main panel copy — "Select Body Part", "No Exercise Selected", "Select an exercise to start logging." — are all English. This is the core workout-tracking surface, used every session.
  - **Fix**: Audit `src/app/dashboard/gym/client.tsx`, `body.tsx`, and `nutrition-tab.tsx` for hardcoded tab labels and panel copy; route through `t()` with new i18n keys. Given the scope, treat this as the first of several sport modules (football, tennis, etc.) likely to have the same gap — worth a systematic sweep, not a one-off fix.
  - **Suggested command**: `/impeccable harden src/app/dashboard/gym`

- **[P2] Duplicated bottom-nav code with bounce easing across two layouts**
  - **Why it matters**: The detector flagged `cubic-bezier(0.34, 1.56, 0.64, 1)` (an overshoot/"bounce" curve, against the design system's explicit "no bounce or elastic" rule) plus a `width`-based layout transition, duplicated verbatim in `dashboard/layout.tsx` (lines 210, 321) and `coach/layout.tsx` (lines 151, 292). Even if the spring feel is kept intentionally for this nav bubble, having it hand-copied in two files means any future tuning (or fix) has to happen twice and will drift.
  - **Fix**: Extract the bottom-nav-with-swipe component into a shared component (e.g. `components/liquid-bottom-nav.tsx`) parameterized by the nav items, used by both layouts. While extracting, consider swapping the overshoot `cubic-bezier(0.34,1.56,0.64,1)` for an ease-out-expo curve to align with the design system, and confirm the visual difference is acceptable.
  - **Suggested command**: `/impeccable polish` (after the harden passes above)

- **[P2] Sport names and the "Athlete" fallback aren't localized**
  - **Why it matters**: The dashboard home's sport cards come from a hardcoded array (`dashboard/client.tsx:71-77`, `{ name: "Gym" }`, `{ name: "Football" }`, ... `{ name: "Boxing" }`, `{ name: "Swimming" }`). "Gym"/"Football"/"Tennis"/"Basketball" happen to be identical or near-identical in French, masking the bug, but "Boxing" and "Swimming" should read "Boxe" and "Natation" for French users — the gap is just less visible than on the Settings/Coach/Gym pages. Separately, `dashboard/layout.tsx:71-72` falls back to the English literal `"Athlete"` in `` `${t('welcome')}, ${user?.displayName || "Athlete"}!` ``, producing "Bienvenue, Athlete!" for users without a display name.
  - **Fix**: Move the `sports` array's `name` values to i18n keys (`t('sportBoxing')`, `t('sportSwimming')`, etc.), and add a localized fallback name (`t('defaultAthleteName')`) for the welcome string.
  - **Suggested command**: `/impeccable harden src/app/dashboard/client.tsx`

## Persona Red Flags

**Sam (Accessibility-Dependent User)**: Heading structure on `/dashboard` and `/dashboard/insights` is clean (single `<h1>`, no skips). However, the abrupt language-switching mid-page (English Settings inside a French session) is itself a screen-reader problem: VoiceOver/NVDA will mispronounce content if `lang` isn't switched per-section, and there's no indication any `lang` attributes are being set at the mixed-language boundaries.

**Riley (Deliberate Stress Tester)**: Switching the language toggle to French and walking from Dashboard → Settings → Coach View → Gym module surfaces the mixed-language bug immediately and consistently — it's not an edge case, it's the default experience for any non-English user navigating the core product. Confirmed via live authenticated session, not just source inspection.

**Alex (Power User / Coach)**: The swipeable bottom nav and tab-pill indicator are exactly the kind of efficient navigation Alex wants. But landing on an English-only nav bar ("Dashboard / Sports / Messages / Player") while everything else on the Coach Dashboard is in French breaks the "this product respects my language setting" trust signal immediately — a coach managing a French-speaking team will notice this on literally every page load.

## Minor Observations

- **"Streak de Jours" mixes English and French** on `/dashboard/insights` (English "Streak" + French "de Jours") — likely an intentional brand term, but worth confirming against the rest of the i18n vocabulary.
- **Settings "Save All Changes"** has no visible success/confirmation feedback in the static view — worth confirming a toast or inline confirmation fires on save (Heuristic #1 gap if not).
- **"Delete Account"** appears as a plain secondary button with no visible warning copy near it — likely fine if a confirmation dialog exists on click, but worth double-checking the destructive-action guardrails described in Error Prevention.
- **`useTranslation` imported but unused** in `src/app/coach/layout.tsx` (line 41) — a quick grep signal that the translation pass never reached this file.

## Questions to Consider

- Was the i18n harden pass deliberately scoped to the landing page only, or did the Settings/Coach/Gym gaps simply not surface because testing happened in English? If the latter, a quick "switch to FR and click through every nav item" pass would catch most of this class of bug going forward.
- Given how much of the authenticated app appears to share this gap (Settings, Coach nav, Gym — likely Football/Tennis/Basketball/Boxing/Swimming modules too), would a systematic i18n audit across all of `src/app/dashboard/**` and `src/app/coach/**` be worth doing in one pass rather than module-by-module?
- Is the bottom-nav-with-swipe component intentionally duplicated for independent evolution, or would extracting a shared component now save more time than it costs?
