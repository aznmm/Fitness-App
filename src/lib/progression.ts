import { GROUP_OF_MUSCLE } from './strength';
import { exerciseSessions, workingSets } from './calc';
import { KG_PER_LB, fromKg, toKg } from './units';
import type { Exercise, Unit, Workout, WorkoutExercise, WorkoutSet } from '../types';

export type SuggestionReason = 'increase' | 'repeat' | 'deload' | 'more-reps' | 'longer' | 'routine';

export interface Suggestion {
  /** kg; undefined for pure bodyweight work. */
  weight?: number;
  reps?: number;
  duration?: number;
  reason: SuggestionReason;
  /** Short explanation shown under the target. */
  note: string;
}

/** Load jump for the next session, in the display unit. */
export function weightIncrement(exercise: Exercise, unit: Unit): number {
  const lower = GROUP_OF_MUSCLE[exercise.primary] === 'legs' || exercise.id === 'deadlift';
  switch (exercise.equipment) {
    case 'barbell':
      return unit === 'lb' ? (lower ? 10 : 5) : lower ? 5 : 2.5;
    case 'dumbbell':
      return unit === 'lb' ? 5 : 2;
    case 'kettlebell':
      return unit === 'lb' ? 10 : 4;
    default:
      return unit === 'lb' ? 5 : 2.5;
  }
}

/** Round kg to the nearest loadable step in the display unit, returned in kg. */
export function roundToStep(kg: number, step: number, unit: Unit): number {
  const display = fromKg(kg, unit);
  // The epsilon keeps halves rounding up despite lb↔kg float noise (157.5 → 160, not 155).
  return toKg(Math.round(display / step + 1e-9) * step, unit);
}

const STALL_SESSIONS = 3;
const DELOAD = 0.9;

/**
 * Double progression: repeat a weight until every working set hits the target
 * reps, then add one increment. Three stalled sessions in a row → deload 10%.
 */
export function suggestNext(
  exercise: Exercise,
  history: Workout[],
  before: number,
  unit: Unit,
  target?: WorkoutExercise['target'],
): Suggestion | null {
  const sessions = exerciseSessions(history, exercise.id)
    .filter((s) => s.date < before)
    .map((s) => workingSets(s.sets))
    .filter((sets) => sets.length > 0);
  const last = sessions[sessions.length - 1];

  if (!last) {
    if (target?.weight || target?.reps) {
      return { weight: target.weight, reps: target.reps, reason: 'routine', note: 'Target from your routine' };
    }
    return null;
  }

  if (exercise.type === 'duration') {
    const best = Math.max(...last.map((s) => s.duration ?? 0));
    if (!best) return null;
    return { duration: best + (best >= 60 ? 10 : 5), reason: 'longer', note: 'Hold a little longer than last time' };
  }

  if (exercise.type === 'reps') {
    const bestReps = Math.max(...last.map((s) => s.reps ?? 0));
    if (!bestReps) return null;
    const added = Math.max(0, ...last.map((s) => s.weight ?? 0));
    return { weight: added || undefined, reps: bestReps + 1, reason: 'more-reps', note: 'One more rep than your best set last time' };
  }

  if (exercise.type !== 'weight_reps') return null;

  const top = topWeight(last);
  if (!top) return null;
  const atTop = last.filter((s) => (s.weight ?? 0) === top);
  const goal = target?.reps ?? atTop[0].reps ?? 0;
  if (!goal) return null;

  const hitAll = atTop.every((s) => (s.reps ?? 0) >= goal);
  if (hitAll) {
    const inc = weightIncrement(exercise, unit);
    return {
      weight: toKg(fromKg(top, unit) + inc, unit),
      reps: goal,
      reason: 'increase',
      note: `+${inc} ${unit}: you hit ${goal} reps on every set last time`,
    };
  }

  const recent = sessions.slice(-STALL_SESSIONS);
  const stalled =
    recent.length === STALL_SESSIONS &&
    recent.every((sets) => topWeight(sets) === top && sets.filter((s) => (s.weight ?? 0) === top).some((s) => (s.reps ?? 0) < goal));
  if (stalled) {
    return {
      weight: roundToStep(top * DELOAD, weightIncrement(exercise, unit), unit),
      reps: goal,
      reason: 'deload',
      note: `Stuck for ${STALL_SESSIONS} sessions: drop 10% and build back up`,
    };
  }

  return { weight: top, reps: goal, reason: 'repeat', note: `Same weight: aim for ${goal} reps on every set` };
}

function topWeight(sets: WorkoutSet[]): number {
  return Math.max(0, ...sets.map((s) => s.weight ?? 0));
}

/**
 * Warm-up ramp toward the first working weight. Barbell lifts start with the
 * empty bar; everything else starts around half the working weight.
 */
export function warmupSets(exercise: Exercise, workingKg: number, unit: Unit, barKg: number): Pick<WorkoutSet, 'weight' | 'reps'>[] {
  if (!(workingKg > 0)) return [];
  const step = exercise.equipment === 'dumbbell' ? (unit === 'lb' ? 5 : 2) : unit === 'lb' ? 5 : 2.5;
  const scheme: [number, number][] = exercise.equipment === 'barbell' ? [[0.5, 5], [0.7, 3], [0.85, 1]] : [[0.5, 8], [0.75, 4]];
  const out: Pick<WorkoutSet, 'weight' | 'reps'>[] = [];
  if (exercise.equipment === 'barbell' && workingKg > barKg * 1.3) out.push({ weight: barKg, reps: 10 });
  for (const [pct, reps] of scheme) {
    const w = roundToStep(workingKg * pct, step, unit);
    const prev = out[out.length - 1]?.weight ?? 0;
    // Skip steps that are too close to the previous one or to the working weight.
    if (w <= prev + toKg(step / 2, unit) || w >= workingKg - toKg(step / 2, unit)) continue;
    if (exercise.equipment === 'barbell' && w < barKg) continue;
    out.push({ weight: w, reps });
  }
  return out;
}

export const PLATES: Record<Unit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export const BAR_OPTIONS: Record<Unit, number[]> = {
  lb: [45, 35, 25, 15],
  kg: [20, 15, 10],
};

/** Default bar: 45 lb or 20 kg, stored in kg. */
export function defaultBarKg(unit: Unit): number {
  return unit === 'lb' ? 45 * KG_PER_LB : 20;
}

export interface PlateLoad {
  /** Plates for ONE side, heaviest first, in the display unit. */
  plates: number[];
  /** Total weight actually loaded, in the display unit. */
  loaded: number;
  exact: boolean;
}

/** Greedy plate breakdown per side for a target total weight (display unit). */
export function platesPerSide(total: number, bar: number, unit: Unit): PlateLoad {
  let perSide = Math.max(0, (total - bar) / 2);
  const plates: number[] = [];
  for (const p of PLATES[unit]) {
    while (perSide + 1e-9 >= p) {
      plates.push(p);
      perSide -= p;
    }
  }
  const loaded = bar + 2 * plates.reduce((a, p) => a + p, 0);
  return { plates, loaded, exact: Math.abs(loaded - Math.max(total, bar)) < 1e-6 };
}
