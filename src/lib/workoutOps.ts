import type { Exercise, Routine, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { lastPerformance } from './calc';
import { defaultWorkoutName } from './dates';
import { uid } from './id';

export type WorkoutUpdater = (w: Workout) => Workout;

export function blankSet(from?: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: uid(),
    kind: from?.kind === 'warmup' ? 'warmup' : 'normal',
    weight: from?.weight,
    reps: from?.reps,
    duration: from?.duration,
    distance: from?.distance,
    done: false,
  };
}

/** How many sets to give an exercise added on the fly: match last time, else a sensible default. */
function defaultSetCount(exercise: Exercise | undefined, history: Workout[]): number {
  const last = exercise ? lastPerformance(history, exercise.id).filter((s) => s.kind !== 'warmup').length : 0;
  if (last) return Math.min(last, 8);
  return exercise?.type === 'distance_duration' ? 1 : 3;
}

export function newWorkoutExercise(exercise: Exercise | undefined, exerciseId: string, history: Workout[]): WorkoutExercise {
  const n = defaultSetCount(exercise, history);
  return { id: uid(), exerciseId, sets: Array.from({ length: n }, () => blankSet()) };
}

export function createWorkout(opts: { name?: string; routine?: Routine; now?: number } = {}): Workout {
  const now = opts.now ?? Date.now();
  const exercises: WorkoutExercise[] =
    opts.routine?.exercises.map((re) => ({
      id: uid(),
      exerciseId: re.exerciseId,
      restSec: re.restSec,
      target: re.reps || re.weight ? { reps: re.reps, weight: re.weight } : undefined,
      sets: Array.from({ length: Math.max(1, re.sets) }, () => blankSet()),
    })) ?? [];
  return {
    id: uid(),
    name: opts.name ?? opts.routine?.name ?? defaultWorkoutName(now),
    startedAt: now,
    exercises,
    routineId: opts.routine?.id,
  };
}

export const addExercises =
  (ids: string[], exercisesById: Map<string, Exercise>, history: Workout[]): WorkoutUpdater =>
  (w) => ({ ...w, exercises: [...w.exercises, ...ids.map((id) => newWorkoutExercise(exercisesById.get(id), id, history))] });

export const removeExercise =
  (weId: string): WorkoutUpdater =>
  (w) => ({ ...w, exercises: w.exercises.filter((we) => we.id !== weId) });

export const moveExercise =
  (weId: string, delta: number): WorkoutUpdater =>
  (w) => {
    const i = w.exercises.findIndex((we) => we.id === weId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= w.exercises.length) return w;
    const exercises = [...w.exercises];
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
    return { ...w, exercises };
  };

const mapExercise = (w: Workout, weId: string, fn: (we: WorkoutExercise) => WorkoutExercise): Workout => ({
  ...w,
  exercises: w.exercises.map((we) => (we.id === weId ? fn(we) : we)),
});

export const replaceExercise =
  (weId: string, exerciseId: string): WorkoutUpdater =>
  (w) =>
    mapExercise(w, weId, (we) => ({
      ...we,
      exerciseId,
      target: undefined,
      sets: we.sets.map((s) => ({ ...s, weight: undefined, reps: undefined, duration: undefined, distance: undefined, done: false })),
    }));

export const patchExercise =
  (weId: string, patch: Partial<Pick<WorkoutExercise, 'notes' | 'restSec'>>): WorkoutUpdater =>
  (w) =>
    mapExercise(w, weId, (we) => ({ ...we, ...patch }));

/** New set copies the previous set's values so progressing through sets is one tap. */
export const addSet =
  (weId: string): WorkoutUpdater =>
  (w) =>
    mapExercise(w, weId, (we) => ({ ...we, sets: [...we.sets, blankSet(we.sets[we.sets.length - 1])] }));

export const removeSet =
  (weId: string, setId: string): WorkoutUpdater =>
  (w) =>
    mapExercise(w, weId, (we) => ({ ...we, sets: we.sets.filter((s) => s.id !== setId) }));

export const patchSet =
  (weId: string, setId: string, patch: Partial<WorkoutSet>): WorkoutUpdater =>
  (w) =>
    mapExercise(w, weId, (we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

/** Keep only completed sets; drop exercises left empty. */
export function pruneIncomplete(w: Workout): Workout {
  return {
    ...w,
    exercises: w.exercises
      .map((we) => ({ ...we, sets: we.sets.filter((s) => s.done) }))
      .filter((we) => we.sets.length > 0),
  };
}

export function countIncompleteSets(w: Workout): number {
  return w.exercises.reduce((n, we) => n + we.sets.filter((s) => !s.done).length, 0);
}

export function countDoneSets(w: Workout): number {
  return w.exercises.reduce((n, we) => n + we.sets.filter((s) => s.done).length, 0);
}

/** Turn a finished workout into a reusable routine. */
export function routineFromWorkout(w: Workout, now = Date.now()): Routine {
  return {
    id: uid(),
    name: w.name,
    createdAt: now,
    exercises: w.exercises.map((we) => {
      const working = we.sets.filter((s) => s.kind !== 'warmup');
      const reps = working.map((s) => s.reps).find((r) => r);
      return { id: uid(), exerciseId: we.exerciseId, sets: Math.max(1, working.length || we.sets.length), reps, restSec: we.restSec };
    }),
  };
}
