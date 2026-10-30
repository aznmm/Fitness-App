import { beforeEach, describe, expect, it } from 'vitest';
import { makeBackup, parseBackup } from '../lib/backup';
import { cleanData } from '../lib/sanitize';
import { addExercises } from '../lib/workoutOps';
import { useStore } from '../store/useStore';
import { byId } from './helpers';

const backupOf = (data: object) => JSON.stringify({ format: 'forge-backup', version: 1, data });

describe('damaged backups', () => {
  beforeEach(() => useStore.getState().resetAll());

  it('fills in missing lists instead of crashing', () => {
    const d = parseBackup(backupOf({ workouts: [{ id: 'w1', name: 'x', startedAt: 1, endedAt: 2 }, { id: 'w2', startedAt: 3, exercises: [{ exerciseId: 'squat' }] }] }));
    expect(d.workouts?.[0].exercises).toEqual([]);
    expect(d.workouts?.[1].exercises[0].sets).toEqual([]);
    expect(d.workouts?.[1].exercises[0].id).toBeTruthy();
    expect(d.workouts?.[1].name).toBe('Workout');
  });

  it('leaves out records that cannot be repaired', () => {
    const d = parseBackup(backupOf({ workouts: [null, 3, 'x', { name: 'no id', startedAt: 1 }, { id: 'ok', startedAt: 1, exercises: [] }], routines: [null] }));
    expect(d.workouts?.map((w) => w.id)).toEqual(['ok']);
    expect(d.routines).toEqual([]);
  });

  it('drops impossible numbers', () => {
    const d = cleanData({
      workouts: [{ id: 'w', startedAt: 1, exercises: [{ exerciseId: 'bench-press', sets: [{ id: 's', weight: 1e9, reps: -8, done: true }] }] }],
      steps: [{ id: 'steps:', date: '', count: 5 }],
    });
    const set = d.workouts?.[0].exercises[0].sets[0];
    expect(set?.weight).toBeUndefined();
    expect(set?.reps).toBeUndefined();
    expect(d.steps).toEqual([]);
  });

  it('can restore a repaired backup and render-safe data comes back', () => {
    useStore.getState().replaceAll(parseBackup(backupOf({ workouts: [{ id: 'w1', startedAt: 1, endedAt: 2 }] })));
    expect(useStore.getState().workouts[0].exercises).toEqual([]);
  });

  it('keeps a workout in progress when replacing everything', () => {
    const s = useStore.getState();
    s.startWorkout({ name: 'Now' });
    s.updateActive(addExercises(['squat'], byId, []));
    const text = JSON.stringify(makeBackup({ ...useStore.getState(), active: { id: 'old', name: 'Stale', startedAt: 1, exercises: [] } }));
    s.replaceAll(parseBackup(text));
    expect(useStore.getState().active?.name).toBe('Now');
  });
});
