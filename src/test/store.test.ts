import { beforeEach, describe, expect, it } from 'vitest';
import { makeBackup, parseBackup, workoutsToCsv } from '../lib/backup';
import { addExercises, patchSet } from '../lib/workoutOps';
import { useStore } from '../store/useStore';
import { byId } from './helpers';
import type { Settings } from '../types';

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

  it('adds a backup from another context without losing what is already here', () => {
    const logWorkout = (name: string) => {
      const s = useStore.getState();
      s.startWorkout({ name });
      s.updateActive(addExercises(['squat'], byId, []));
      const we = useStore.getState().active!.exercises[0];
      s.updateActive(patchSet(we.id, we.sets[0].id, { weight: 100, reps: 5, done: true }));
      s.finishWorkout();
    };

    // "Safari": two workouts and kg, copied as text.
    logWorkout('Safari 1');
    logWorkout('Safari 2');
    useStore.getState().updateSettings({ unit: 'kg' });
    const text = JSON.stringify(makeBackup(useStore.getState()));

    // "Home-screen app": separate storage with its own workout and untouched settings.
    useStore.setState({ workouts: [], routines: [], bodyweights: [], deleted: {}, settings: { ...useStore.getState().settings, unit: 'lb' }, settingsUpdatedAt: 0 });
    logWorkout('Home screen');

    const s = useStore.getState();
    s.mergeIn(parseBackup(text));
    s.mergeIn(parseBackup(text)); // pasting twice doesn't duplicate
    expect(useStore.getState().workouts.map((w) => w.name).sort()).toEqual(['Home screen', 'Safari 1', 'Safari 2']);
    expect(useStore.getState().settings.unit).toBe('kg');

    // Records in the backup come back even if they were deleted here before.
    s.resetAll();
    s.mergeIn(parseBackup(text));
    expect(useStore.getState().workouts.map((w) => w.name).sort()).toEqual(['Safari 1', 'Safari 2']);
  });

  it('ticks each set by default, and older saved settings pick that up', () => {
    expect(useStore.getState().settings.tickMode).toBe('set');
    const { tickMode: _t, ...old } = useStore.getState().settings;
    useStore.getState().replaceAll({ settings: old as Settings });
    expect(useStore.getState().settings.tickMode).toBe('set');
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Forge backup/);
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
  });
});
