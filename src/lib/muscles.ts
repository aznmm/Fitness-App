import { MUSCLE_FILTERS } from '../data/exercises';
import type { Exercise, Muscle, Workout } from '../types';
import { workingSets } from './calc';
import { DAY_MS } from './dates';

export const MAP_MUSCLES: Muscle[] = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'traps',
  'lats',
  'back',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
];

function addSets(out: Partial<Record<Muscle, number>>, ex: Exercise, sets: number, scale = 1) {
  out[ex.primary] = (out[ex.primary] ?? 0) + sets * scale;
  for (const m of ex.secondary) if (m !== ex.primary) out[m] = (out[m] ?? 0) + sets * 0.5 * scale;
}

/** Working sets per muscle since `since` (secondary muscles count half). */
export function muscleSets(workouts: Workout[], byId: Map<string, Exercise>, since: number): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const w of workouts) {
    if (!w.endedAt || w.startedAt < since) continue;
    for (const we of w.exercises) {
      const ex = byId.get(we.exerciseId);
      const n = workingSets(we.sets).length;
      if (ex && n) addSets(out, ex, n);
    }
  }
  return out;
}

/** How long fatigue takes to fall to ~37% (exponential decay constant). */
const RECOVERY_TAU_H = 30;
/** Set-equivalents of remaining fatigue that count as fully fatigued. */
const FULL_FATIGUE_SETS = 10;

/**
 * Remaining fatigue per muscle, 0 (fresh) to 1 (just trained hard). Each
 * working set adds fatigue that decays exponentially, so a hard session is
 * mostly recovered after 2–3 days.
 */
export function muscleFatigue(workouts: Workout[], byId: Map<string, Exercise>, now = Date.now()): Partial<Record<Muscle, number>> {
  const raw: Partial<Record<Muscle, number>> = {};
  const horizon = now - 7 * DAY_MS;
  for (const w of workouts) {
    const at = w.endedAt ?? 0;
    if (!at || at < horizon || at > now) continue;
    const decay = Math.exp(-(now - at) / (RECOVERY_TAU_H * 3_600_000));
    for (const we of w.exercises) {
      const ex = byId.get(we.exerciseId);
      const n = workingSets(we.sets).length;
      if (ex && n) addSets(raw, ex, n, decay);
    }
  }
  const out: Partial<Record<Muscle, number>> = {};
  for (const [m, v] of Object.entries(raw) as [Muscle, number][]) {
    const f = Math.min(1, v / FULL_FATIGUE_SETS);
    if (f >= 0.02) out[m] = f;
  }
  return out;
}

export type RecoveryStatus = 'fresh' | 'recovering' | 'fatigued';

export function recoveryStatus(fatigue: number): RecoveryStatus {
  if (fatigue < 0.25) return 'fresh';
  if (fatigue < 0.6) return 'recovering';
  return 'fatigued';
}

const RECOVERY_GROUPS = MUSCLE_FILTERS.filter((f) => f.id !== 'cardio');

/** Highest remaining fatigue among each display group's muscles. */
export function groupFatigue(fatigue: Partial<Record<Muscle, number>>) {
  return RECOVERY_GROUPS.map((g) => {
    const f = Math.max(0, ...g.muscles.map((m) => fatigue[m] ?? 0));
    return { id: g.id, label: g.label, fatigue: f, status: recoveryStatus(f) };
  });
}
