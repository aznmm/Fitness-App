import { describe, expect, it } from 'vitest';
import { addExercises, addSet, createWorkout, pruneIncomplete, routineFromWorkout } from '../lib/workoutOps';
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
