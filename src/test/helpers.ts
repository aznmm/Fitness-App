import { BUILT_IN_EXERCISES } from '../data/exercises';
import type { Workout, WorkoutSet } from '../types';

export const byId = new Map(BUILT_IN_EXERCISES.map((e) => [e.id, e]));

let n = 0;
export function set(weight: number | undefined, reps: number | undefined, extra: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: `s${++n}`, kind: 'normal', weight, reps, done: true, ...extra };
}

export function workout(startedAt: number, exercises: Record<string, WorkoutSet[]>, extra: Partial<Workout> = {}): Workout {
  return {
    id: `w${++n}`,
    name: 'Test',
    startedAt,
    endedAt: startedAt + 3600_000,
    exercises: Object.entries(exercises).map(([exerciseId, sets]) => ({ id: `we${++n}`, exerciseId, sets })),
    ...extra,
  };
}

export const DAY = 86_400_000;
/** A fixed Wednesday noon so week maths is deterministic. */
export const NOW = new Date(2026, 9, 21, 12).getTime();
