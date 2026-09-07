#!/usr/bin/env node
/**
 * Why the streak changes every time you look at it.
 *
 *   node scripts/streak/reproduce.mjs
 *
 * `summariseStreak` is pure and correct: it dedupes by calendar day and the
 * arithmetic is stable. The instability is upstream of it — the *set of dates*
 * handed to it is assembled from six independent sources, any of which can come
 * back empty without anything going wrong loudly:
 *
 *   - the gym plan, read from `usePlanStore` before that store has hydrated
 *   - completed sessions and workout days, which need an auth token
 *   - five sport collections plus nutritionLogs, read through `Promise.allSettled`
 *   - bodyweight logs, in their own try/catch
 *
 * Every one of those failure paths logs a warning and carries on, and then the
 * result — computed from whatever survived — is written to state as if it were
 * the truth. This walks through the combinations and prints what the athlete
 * would see.
 */
import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';

// A re-implementation would prove nothing, so this is the shipped function,
// transcribed. It is pure and has no imports beyond date-fns.
const dayKey = (d) => format(d, 'yyyy-MM-dd');
const fromKey = (k) => startOfDay(new Date(`${k}T00:00:00`));

function summariseStreak(dates, now = new Date()) {
  const today = startOfDay(now);
  const past = dates.filter((d) => differenceInCalendarDays(today, startOfDay(d)) >= 0);
  if (past.length === 0) return { current: 0, longest: 0, activeToday: false, activeDays: [] };
  const uniqueKeys = Array.from(new Set(past.map(dayKey))).sort().reverse();
  const descending = uniqueKeys.map(fromKey);
  const gap = differenceInCalendarDays(today, descending[0]);
  let current = 0;
  if (gap === 0 || gap === 1) {
    current = 1;
    for (let i = 1; i < descending.length; i++) {
      if (differenceInCalendarDays(descending[i - 1], descending[i]) === 1) current += 1;
      else break;
    }
  }
  return { current, activeToday: gap === 0 };
}

const today = startOfDay(new Date());
const ago = (n) => subDays(today, n);

/**
 * One athlete, one true history: they have trained every day for a fortnight.
 * Today they ticked off a gym day; yesterday and before came from sessions and
 * matches. Just now they logged a meal.
 */
const SOURCES = {
  gymPlan:       { label: 'completed gym days (plan store)', dates: [ago(0), ago(3), ago(6), ago(9)] },
  sessions:      { label: 'ticked-off sessions (needs token)', dates: [ago(1), ago(4), ago(7), ago(10)] },
  workoutDays:   { label: 'finished workouts (needs token)', dates: [ago(2), ago(5), ago(8), ago(11)] },
  sportMatches:  { label: 'sport collections', dates: [ago(12), ago(13)] },
  nutritionLogs: { label: 'nutrition logs', dates: [ago(0)] },
  bodyweight:    { label: 'bodyweight logs', dates: [ago(6)] },
};

const ALL = Object.keys(SOURCES);
const truth = summariseStreak(ALL.flatMap((k) => SOURCES[k].dates)).current;

console.log(`The athlete has genuinely trained ${truth} days running.\n`);
console.log('What they actually see, depending on which reads happened to succeed:\n');

/** The realistic degradations, not every one of the 64 subsets. */
const SCENARIOS = [
  ['everything succeeded', ALL],
  ['plan store had not hydrated yet', ALL.filter((k) => k !== 'gymPlan')],
  ['auth token not ready — no sessions or workouts', ALL.filter((k) => k !== 'sessions' && k !== 'workoutDays')],
  ['plan not hydrated AND token not ready', ALL.filter((k) => !['gymPlan', 'sessions', 'workoutDays'].includes(k))],
  ['a sport collection query was refused', ALL.filter((k) => k !== 'sportMatches')],
  ['bodyweight read failed', ALL.filter((k) => k !== 'bodyweight')],
];

const seen = new Set();
for (const [name, keys] of SCENARIOS) {
  const s = summariseStreak(keys.flatMap((k) => SOURCES[k].dates));
  seen.add(s.current);
  const delta = s.current - truth;
  console.log(
    `  ${String(s.current).padStart(3)} days  ${delta === 0 ? '        ' : `(${delta > 0 ? '+' : ''}${delta})`.padStart(8)}  ${name}`
  );
}

console.log(`\nDistinct values one athlete can be shown on one day: ${[...seen].sort((a, b) => b - a).join(', ')}`);
console.log('Every one of them was written to state and to localStorage as the answer.\n');

/* ────────────────────────────────────────────────────────────────────────── */

console.log('With the fix — a partial read no longer publishes:\n');

/**
 * The shipped rule, in miniature: a run that did not read every source keeps
 * the last figure that did, and asks to be retried. Only the first calculation
 * of all, when there is nothing better to show, is allowed through.
 */
function publish(state, keys) {
  const complete = keys.length === ALL.length;
  const value = summariseStreak(keys.flatMap((k) => SOURCES[k].dates)).current;
  if (!complete && state.lastCompleteAt !== null) {
    return { ...state, shown: state.shown, retried: true };
  }
  return { shown: value, lastCompleteAt: complete ? Date.now() : state.lastCompleteAt, retried: !complete };
}

let state = { shown: 0, lastCompleteAt: null, retried: false };
const TIMELINE = [
  ['cold load, plan not hydrated, no token', ALL.filter((k) => !['gymPlan', 'sessions', 'workoutDays'].includes(k))],
  ['a moment later, everything ready', ALL],
  ['navigates to another page, plan re-reading', ALL.filter((k) => k !== 'gymPlan')],
  ['logs a meal', ALL],
  ['tab refocused, a query is refused', ALL.filter((k) => k !== 'sportMatches')],
  ['and again, all good', ALL],
];

const shownValues = [];
for (const [when, keys] of TIMELINE) {
  state = publish(state, keys);
  shownValues.push(state.shown);
  console.log(`  ${String(state.shown).padStart(3)} days   ${state.retried ? 'retry queued ' : '             '} ${when}`);
}

const afterFirst = shownValues.slice(1);
const stable = new Set(afterFirst).size === 1 && afterFirst[0] === truth;
console.log(`\nAfter the first complete read the figure never moves again: ${stable ? 'yes' : 'NO'}`);
console.log(`The only change the athlete sees is the one they caused.`);
process.exit(stable ? 0 : 1);
