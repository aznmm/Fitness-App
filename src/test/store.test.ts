import { beforeEach, describe, expect, it } from 'vitest';
import { makeBackup, parseBackup, workoutsToCsv } from '../lib/backup';
import { addExercises, patchSet } from '../lib/workoutOps';
import { useStore } from '../store/useStore';
import { byId } from './helpers';

describe('store', () => {
  beforeEach(() => useStore.getState().resetAll());

  it('runs a workout from start to finish', () => {
    const s = useStore.getState();
    s.startWorkout({ name: 'Leg day' });
    s.updateActive(addExercises(['squat'], byId, []));
    const active = useStore.getState().active!;
    const we = active.exercises[0];
    s.updateActive(patchSet(we.id, we.sets[0].id, { weight: 100, reps: 5, done: true }));

    const saved = useStore.getState().finishWorkout();
    expect(saved?.exercises[0].sets).toHaveLength(1);
    expect(saved?.endedAt).toBeGreaterThan(0);
    expect(useStore.getState().active).toBeNull();
    expect(useStore.getState().workouts).toHaveLength(1);
  });

  it('refuses to save a workout with no completed sets', () => {
    const s = useStore.getState();
    s.startWorkout();
    s.updateActive(addExercises(['squat'], byId, []));
    expect(s.finishWorkout()).toBeNull();
    expect(useStore.getState().active).not.toBeNull();
  });

  it('marks a routine as used when started', () => {
    const s = useStore.getState();
    s.saveRoutine({ id: 'r', name: 'Pull', createdAt: 0, exercises: [{ id: 'e', exerciseId: 'pull-up', sets: 3 }] });
    const w = s.startWorkout({ routineId: 'r' });
    expect(w.exercises).toHaveLength(1);
    expect(useStore.getState().routines[0].lastUsedAt).toBe(w.startedAt);
  });

  it('round-trips a backup and exports CSV', () => {
    const s = useStore.getState();
    s.startWorkout({ name: 'A, "quoted" day' });
    s.updateActive(addExercises(['bench-press'], byId, []));
    const we = useStore.getState().active!.exercises[0];
    s.updateActive(patchSet(we.id, we.sets[0].id, { weight: 100, reps: 5, done: true }));
    s.finishWorkout();
    s.addBodyweight(80);

    const text = JSON.stringify(makeBackup(useStore.getState()));
    s.resetAll();
    s.replaceAll(parseBackup(text));
    expect(useStore.getState().workouts).toHaveLength(1);
    expect(useStore.getState().bodyweights[0].weight).toBe(80);

    const csv = workoutsToCsv(useStore.getState(), byId, 'kg');
    expect(csv.split('\n')[1]).toContain('"A, ""quoted"" day",Bench Press,1,normal,100,5');
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Forge backup/);
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
  });
});
