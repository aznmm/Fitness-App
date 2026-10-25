import type { Exercise, ExerciseType, Workout, WorkoutSet } from '../types';

/** Epley estimate of a one-rep max. */
export function estimate1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Done sets that count toward stats (warm-ups are excluded). */
export function isWorkingSet(set: WorkoutSet): boolean {
  return set.done && set.kind !== 'warmup';
}

export function workingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter(isWorkingSet);
}

/** Load that actually moved: bodyweight exercises add the lifter's bodyweight. */
export function effectiveLoad(set: WorkoutSet, type: ExerciseType, bodyweightKg?: number): number {
  const added = set.weight ?? 0;
  if (type === 'reps') return (bodyweightKg ?? 0) + added;
  return added;
}

export function setE1RM(set: WorkoutSet, type: ExerciseType, bodyweightKg?: number): number {
  if (type !== 'weight_reps' && type !== 'reps') return 0;
  return estimate1RM(effectiveLoad(set, type, bodyweightKg), set.reps ?? 0);
}

export function setVolume(set: WorkoutSet): number {
  return (set.weight ?? 0) * (set.reps ?? 0);
}

export function workoutVolume(w: Workout): number {
  let total = 0;
  for (const we of w.exercises) for (const s of workingSets(we.sets)) total += setVolume(s);
  return total;
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, we) => n + workingSets(we.sets).length, 0);
}

export function workoutDurationMs(w: Workout): number {
  return (w.endedAt ?? Date.now()) - w.startedAt;
}

export interface ExerciseSession {
  workoutId: string;
  date: number;
  sets: WorkoutSet[];
}

/** Every completed session of one exercise, oldest first. Only done sets are kept. */
export function exerciseSessions(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    if (!w.endedAt) continue;
    const sets = w.exercises.filter((we) => we.exerciseId === exerciseId).flatMap((we) => we.sets.filter((s) => s.done));
    if (sets.length) out.push({ workoutId: w.id, date: w.startedAt, sets });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** The done sets from the latest finished workout (before `before`) that included the exercise. */
export function lastPerformance(workouts: Workout[], exerciseId: string, before = Infinity): WorkoutSet[] {
  let best: Workout | undefined;
  for (const w of workouts) {
    if (!w.endedAt || w.startedAt >= before) continue;
    if (!w.exercises.some((we) => we.exerciseId === exerciseId && we.sets.some((s) => s.done))) continue;
    if (!best || w.startedAt > best.startedAt) best = w;
  }
  if (!best) return [];
  return best.exercises.filter((we) => we.exerciseId === exerciseId).flatMap((we) => we.sets.filter((s) => s.done));
}

export interface ExerciseRecords {
  sessions: number;
  bestE1RM: number;
  bestE1RMSet?: WorkoutSet;
  heaviest: number;
  mostReps: number;
  bestSessionVolume: number;
  longestDuration: number;
  longestDistance: number;
}

export function emptyRecords(): ExerciseRecords {
  return { sessions: 0, bestE1RM: 0, heaviest: 0, mostReps: 0, bestSessionVolume: 0, longestDuration: 0, longestDistance: 0 };
}

export function recordsFromSessions(sessions: ExerciseSession[], type: ExerciseType, bodyweightKg?: number): ExerciseRecords {
  const r = emptyRecords();
  r.sessions = sessions.length;
  for (const session of sessions) {
    let vol = 0;
    for (const s of workingSets(session.sets)) {
      const e = setE1RM(s, type, bodyweightKg);
      if (e > r.bestE1RM) {
        r.bestE1RM = e;
        r.bestE1RMSet = s;
      }
      r.heaviest = Math.max(r.heaviest, s.weight ?? 0);
      r.mostReps = Math.max(r.mostReps, s.reps ?? 0);
      r.longestDuration = Math.max(r.longestDuration, s.duration ?? 0);
      r.longestDistance = Math.max(r.longestDistance, s.distance ?? 0);
      vol += setVolume(s);
    }
    r.bestSessionVolume = Math.max(r.bestSessionVolume, vol);
  }
  return r;
}

export function exerciseRecords(workouts: Workout[], exercise: Exercise, bodyweightKg?: number, before = Infinity): ExerciseRecords {
  const sessions = exerciseSessions(workouts, exercise.id).filter((s) => s.date < before);
  return recordsFromSessions(sessions, exercise.type, bodyweightKg);
}

export type PRKind = 'e1rm' | 'weight' | 'reps' | 'duration' | 'distance';

/**
 * Which records a set beats compared to `prev`. A first-ever session never
 * counts as a PR — there is nothing to beat yet.
 */
export function setPRs(set: WorkoutSet, type: ExerciseType, prev: ExerciseRecords, bodyweightKg?: number): PRKind[] {
  if (!isWorkingSet(set) || prev.sessions === 0) return [];
  const out: PRKind[] = [];
  const eps = 1e-6;
  if (type === 'weight_reps' || type === 'reps') {
    const e = setE1RM(set, type, bodyweightKg);
    // Without a bodyweight, a bodyweight lift's 1RM estimate is meaningless.
    if (e > prev.bestE1RM + eps && (type === 'weight_reps' || bodyweightKg)) out.push('e1rm');
    if (type === 'weight_reps' && (set.weight ?? 0) > prev.heaviest + eps) out.push('weight');
    if (type === 'reps' && (set.reps ?? 0) > prev.mostReps) out.push('reps');
  }
  if (type === 'duration' && (set.duration ?? 0) > prev.longestDuration) out.push('duration');
  if (type === 'distance_duration' && (set.distance ?? 0) > prev.longestDistance + eps) out.push('distance');
  return out;
}

export interface WorkoutPR {
  exerciseId: string;
  kind: PRKind;
  set: WorkoutSet;
}

/** Records set in `workout`, measured against every finished workout before it. */
export function workoutPRs(workout: Workout, history: Workout[], exercisesById: Map<string, Exercise>, bodyweightKg?: number): WorkoutPR[] {
  const out: WorkoutPR[] = [];
  const seen = new Set<string>();
  for (const we of workout.exercises) {
    if (seen.has(we.exerciseId)) continue;
    seen.add(we.exerciseId);
    const ex = exercisesById.get(we.exerciseId);
    if (!ex) continue;
    const prev = exerciseRecords(
      history.filter((w) => w.id !== workout.id),
      ex,
      bodyweightKg,
      workout.startedAt,
    );
    const sets = workout.exercises.filter((x) => x.exerciseId === we.exerciseId).flatMap((x) => x.sets);
    // Report each kind once per exercise, using the set that beat it by the most.
    const bestByKind = new Map<PRKind, { set: WorkoutSet; value: number }>();
    for (const s of sets) {
      for (const kind of setPRs(s, ex.type, prev, bodyweightKg)) {
        const value =
          kind === 'e1rm' ? setE1RM(s, ex.type, bodyweightKg)
          : kind === 'weight' ? (s.weight ?? 0)
          : kind === 'reps' ? (s.reps ?? 0)
          : kind === 'duration' ? (s.duration ?? 0)
          : (s.distance ?? 0);
        const cur = bestByKind.get(kind);
        if (!cur || value > cur.value) bestByKind.set(kind, { set: s, value });
      }
    }
    for (const [kind, { set }] of bestByKind) out.push({ exerciseId: we.exerciseId, kind, set });
  }
  return out;
}

/** Heaviest weight lifted for at least N reps, for the classic rep-max table. */
export function repMaxes(sessions: ExerciseSession[], targets = [1, 3, 5, 8, 10, 12]): { reps: number; weight: number; date?: number }[] {
  return targets.map((reps) => {
    let weight = 0;
    let date: number | undefined;
    for (const session of sessions) {
      for (const s of workingSets(session.sets)) {
        if ((s.reps ?? 0) >= reps && (s.weight ?? 0) > weight) {
          weight = s.weight ?? 0;
          date = session.date;
        }
      }
    }
    return { reps, weight, date };
  });
}
