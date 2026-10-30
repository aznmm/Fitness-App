import type { Exercise, Muscle, Routine, Workout } from '../types';
import { workingSets, workoutSetCount, workoutVolume } from './calc';
import { addDays, startOfWeek } from './dates';

export function finished(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.endedAt).sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * When each routine was last done, from the workouts logged with it. Falls
 * back to when it was last started for routines with no linked history.
 */
export function lastDone(workouts: Workout[], routines: Routine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of workouts) {
    if (w.endedAt && w.routineId && w.startedAt > (out.get(w.routineId) ?? 0)) out.set(w.routineId, w.startedAt);
  }
  for (const r of routines) if (!out.has(r.id) && r.lastUsedAt) out.set(r.id, r.lastUsedAt);
  return out;
}

export interface WeekStat {
  weekStart: number;
  workouts: number;
  volume: number;
  sets: number;
}

/** Oldest → newest, always `weeks` entries (zero-filled). */
export function weeklyStats(workouts: Workout[], weeks = 12, now = Date.now()): WeekStat[] {
  const thisWeek = startOfWeek(now);
  const out: WeekStat[] = [];
  const index = new Map<number, WeekStat>();
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(thisWeek, -7 * i);
    const stat = { weekStart: ws, workouts: 0, volume: 0, sets: 0 };
    out.push(stat);
    index.set(ws, stat);
  }
  for (const w of workouts) {
    if (!w.endedAt) continue;
    const stat = index.get(startOfWeek(w.startedAt));
    if (!stat) continue;
    stat.workouts += 1;
    stat.volume += workoutVolume(w);
    stat.sets += workoutSetCount(w);
  }
  return out;
}

/**
 * Consecutive weeks with at least one workout. The current week only counts
 * once it has a workout, so the streak doesn't drop to 0 on Monday morning.
 */
export function weekStreak(workouts: Workout[], now = Date.now()): number {
  const weeks = new Set(workouts.filter((w) => w.endedAt).map((w) => startOfWeek(w.startedAt)));
  let cursor = startOfWeek(now);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/** Muscles shown in the weekly sets breakdown. */
export type VolumeMuscle = Exclude<Muscle, 'lats' | 'traps' | 'cardio' | 'forearms'>;

export const VOLUME_MUSCLES: VolumeMuscle[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

const VOLUME_MUSCLE_OF: Partial<Record<Muscle, VolumeMuscle>> = {
  lats: 'back',
  traps: 'back',
};

/**
 * Working sets per muscle since `since`. The primary muscle gets a full set,
 * each secondary muscle half a set.
 */
export function setsPerMuscle(workouts: Workout[], exercisesById: Map<string, Exercise>, since: number): Record<VolumeMuscle, number> {
  const out = Object.fromEntries(VOLUME_MUSCLES.map((m) => [m, 0])) as Record<VolumeMuscle, number>;
  const bump = (m: Muscle, amount: number) => {
    const key = (VOLUME_MUSCLE_OF[m] ?? m) as VolumeMuscle;
    if (key in out) out[key] += amount;
  };
  for (const w of workouts) {
    if (!w.endedAt || w.startedAt < since) continue;
    for (const we of w.exercises) {
      const ex = exercisesById.get(we.exerciseId);
      if (!ex) continue;
      const n = workingSets(we.sets).length;
      if (!n) continue;
      bump(ex.primary, n);
      // A lift listing both `back` and `lats` shouldn't double-count the back.
      const secondary = new Set(ex.secondary.map((m) => VOLUME_MUSCLE_OF[m] ?? m));
      secondary.delete(VOLUME_MUSCLE_OF[ex.primary] ?? ex.primary);
      for (const m of secondary) bump(m as Muscle, n / 2);
    }
  }
  return out;
}

/** How often each exercise was done, most-used first. */
export function exerciseUsage(workouts: Workout[]): Map<string, { count: number; last: number }> {
  const usage = new Map<string, { count: number; last: number }>();
  for (const w of workouts) {
    if (!w.endedAt) continue;
    for (const id of new Set(w.exercises.map((we) => we.exerciseId))) {
      const u = usage.get(id) ?? { count: 0, last: 0 };
      u.count++;
      u.last = Math.max(u.last, w.startedAt);
      usage.set(id, u);
    }
  }
  return usage;
}
