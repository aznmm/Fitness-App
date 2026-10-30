import { describe, expect, it } from 'vitest';
import {
  addExercises,
  addSet,
  completeSets,
  countUntickedEntries,
  createWorkout,
  insertSet,
  patchSet,
  pruneIncomplete,
  removeExercise,
  removeSet,
  replaceExercise,
  restoreExercise,
  routineFromWorkout,
  uncompleteSets,
} from '../lib/workoutOps';
import type { Routine } from '../types';
import { byId, NOW, set, workout } from './helpers';

const routine: Routine = {
  id: 'r1',
  name: 'Push',
  createdAt: 0,
  exercises: [{ id: 'x', exerciseId: 'bench-press', sets: 3, reps: 8, restSec: 90 }],
};

describe('workout operations', () => {
  it('creates a workout from a routine with targets and empty sets', () => {
    const w = createWorkout({ routine, now: NOW });
    expect(w.name).toBe('Push');
    expect(w.routineId).toBe('r1');
    expect(w.exercises[0].sets).toHaveLength(3);
    expect(w.exercises[0].target).toEqual({ reps: 8, weight: undefined });
    expect(w.exercises[0].restSec).toBe(90);
  });

  it('adds exercises with as many sets as last time', () => {
    const history = [workout(NOW - 1000, { squat: [set(100, 5), set(100, 5), set(100, 5), set(100, 5), set(60, 5, { kind: 'warmup' })] })];
    const w = addExercises(['squat', 'running'], byId, history)(createWorkout({ now: NOW }));
    expect(w.exercises[0].sets).toHaveLength(4);
    expect(w.exercises[1].sets).toHaveLength(1);
  });

  it('copies the previous set when adding one', () => {
    const w = workout(NOW, { squat: [set(100, 5)] });
    const next = addSet(w.exercises[0].id)(w);
    expect(next.exercises[0].sets[1]).toMatchObject({ weight: 100, reps: 5, done: false });
  });

  it('deletes a set and puts it back in place on undo', () => {
    const w = workout(NOW, { squat: [set(100, 5), set(105, 5), set(110, 5)] });
    const we = w.exercises[0];
    const middle = we.sets[1];
    const without = removeSet(we.id, middle.id)(w);
    expect(without.exercises[0].sets.map((s) => s.weight)).toEqual([100, 110]);
    const back = insertSet(we.id, middle, 1)(without);
    expect(back.exercises[0].sets.map((s) => s.weight)).toEqual([100, 105, 110]);
    expect(insertSet(we.id, middle, 1)(back)).toEqual(back); // undoing twice is harmless
  });

  it('ticks a whole exercise at once and can untick it', () => {
    const w = workout(NOW, { squat: [set(100, 5, { done: false }), set(undefined, undefined, { done: false })] });
    const we = w.exercises[0];
    const done = completeSets(we.id, { [we.sets[0].id]: {}, [we.sets[1].id]: { weight: 100, reps: 5 } })(w);
    expect(done.exercises[0].sets.map((s) => [s.done, s.reps])).toEqual([
      [true, 5],
      [true, 5],
    ]);
    expect(uncompleteSets(we.id)(done).exercises[0].sets.every((s) => !s.done)).toBe(true);
  });

  it('can keep unticked sets that have numbers entered', () => {
    const w = workout(NOW, {
      squat: [set(100, 5), set(100, 5, { done: false }), set(undefined, undefined, { done: false })],
      plank: [set(undefined, undefined, { duration: 60, done: false })],
      'leg-press': [set(200, undefined, { done: false })],
    });
    expect(countUntickedEntries(w)).toBe(2);
    expect(pruneIncomplete(w).exercises.map((we) => we.sets.length)).toEqual([1]);
    const kept = pruneIncomplete(w, true);
    expect(kept.exercises.map((we) => we.sets.length)).toEqual([2, 1]);
    expect(kept.exercises.flatMap((we) => we.sets).every((s) => s.done)).toBe(true);
  });

  it('prunes unfinished sets and empty exercises', () => {
    const w = workout(NOW, { squat: [set(100, 5), set(100, 5, { done: false })], 'bench-press': [set(60, 5, { done: false })] });
    const pruned = pruneIncomplete(w);
    expect(pruned.exercises).toHaveLength(1);
    expect(pruned.exercises[0].sets).toHaveLength(1);
  });

  it('turns a workout into a routine', () => {
    const w = workout(NOW, { squat: [set(60, 5, { kind: 'warmup' }), set(100, 5), set(100, 5)] });
    const r = routineFromWorkout(w);
    expect(r.exercises[0]).toMatchObject({ exerciseId: 'squat', sets: 2, reps: 5 });
  });
});

describe('undoing exercise changes', () => {
  it('puts a removed exercise back where it was', () => {
    const w = workout(NOW, { 'bench-press': [set(100, 5)], squat: [set(140, 5)], deadlift: [set(180, 5)] });
    const mid = w.exercises[1];
    const removed = removeExercise(mid.id)(w);
    expect(restoreExercise(mid, 1)(removed).exercises.map((e) => e.exerciseId)).toEqual(['bench-press', 'squat', 'deadlift']);
  });

  it('brings back the sets a replace cleared', () => {
    const w = workout(NOW, { 'bench-press': [set(100, 5)] });
    const old = w.exercises[0];
    const replaced = replaceExercise(old.id, 'dumbbell-fly')(w);
    expect(replaced.exercises[0].sets[0].done).toBe(false);
    expect(restoreExercise(old, 0)(replaced).exercises).toEqual([old]);
  });
});

describe('clearing a ticked set', () => {
  it('unticks it once its main number is gone', () => {
    const w = workout(NOW, { 'bench-press': [set(100, 5)] });
    const we = w.exercises[0];
    const cleared = patchSet(we.id, we.sets[0].id, { reps: undefined })(w);
    expect(cleared.exercises[0].sets[0].done).toBe(false);
    expect(pruneIncomplete(cleared).exercises).toHaveLength(0);
    // Changing the weight alone keeps it ticked.
    expect(patchSet(we.id, we.sets[0].id, { weight: 110 })(w).exercises[0].sets[0].done).toBe(true);
  });
});
