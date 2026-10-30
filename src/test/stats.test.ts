import { describe, expect, it } from 'vitest';
import { shortDay } from '../lib/dates';
import { lastDone, setsPerMuscle, weekStreak, weeklyStats } from '../lib/stats';
import { byId, DAY, NOW, set, workout } from './helpers';

describe('weeklyStats', () => {
  it('buckets finished workouts by Monday-start week', () => {
    const ws = [workout(NOW, { squat: [set(100, 5)] }), workout(NOW - 7 * DAY, { squat: [set(100, 5), set(100, 5)] })];
    const weeks = weeklyStats(ws, 3, NOW);
    expect(weeks.map((w) => w.workouts)).toEqual([0, 1, 1]);
    expect(weeks.map((w) => w.volume)).toEqual([0, 1000, 500]);
    expect(new Date(weeks[2].weekStart).getDay()).toBe(1);
  });
});

describe('weekStreak', () => {
  it('counts consecutive weeks and tolerates an empty current week', () => {
    const lastWeek = workout(NOW - 7 * DAY, {});
    const twoAgo = workout(NOW - 14 * DAY, {});
    const fourAgo = workout(NOW - 28 * DAY, {});
    expect(weekStreak([lastWeek, twoAgo, fourAgo], NOW)).toBe(2);
    expect(weekStreak([workout(NOW, {}), lastWeek], NOW)).toBe(2);
    expect(weekStreak([], NOW)).toBe(0);
  });
});

describe('setsPerMuscle', () => {
  it('gives a full set to the primary muscle and half to secondaries, without double-counting the back', () => {
    const w = workout(NOW - DAY, { 'pull-up': [set(undefined, 8), set(undefined, 8)], 'bench-press': [set(100, 5, { kind: 'warmup' }), set(100, 5)] });
    const sets = setsPerMuscle([w], byId, NOW - 7 * DAY);
    expect(sets.back).toBe(2);
    expect(sets.biceps).toBe(1);
    expect(sets.chest).toBe(1);
    expect(sets.triceps).toBe(0.5);
    expect(sets.shoulders).toBe(0.5);
  });
});

describe('exercise guides', () => {
  it('has a guide for every built-in exercise', async () => {
    const { BUILT_IN_EXERCISES } = await import('../data/exercises');
    const { GUIDES } = await import('../data/guides');
    const missing = BUILT_IN_EXERCISES.filter((e) => !GUIDES[e.id]).map((e) => e.id);
    expect(missing).toEqual([]);
    expect(Object.keys(GUIDES).filter((id) => !BUILT_IN_EXERCISES.some((e) => e.id === id))).toEqual([]);
  });
});

describe('heat scale', () => {
  it('buckets intensities into four steps', async () => {
    const { heatStep } = await import('../components/BodyMap');
    expect([0, 0.1, 0.25, 0.49, 0.5, 0.74, 0.75, 1, 3].map(heatStep)).toEqual([0, 1, 2, 2, 3, 3, 4, 4, 4]);
  });
});

describe('lastDone', () => {
  it('takes the latest logged workout, falling back to when the routine was started', () => {
    const routines = [
      { id: 'r1', name: 'Push', exercises: [], createdAt: 0, lastUsedAt: NOW - 9 * DAY },
      { id: 'r2', name: 'Pull', exercises: [], createdAt: 0, lastUsedAt: NOW - 2 * DAY },
    ];
    const ws = [workout(NOW - 5 * DAY, {}, { routineId: 'r1' }), workout(NOW - 3 * DAY, {}, { routineId: 'r1' }), workout(NOW - DAY, {}, { routineId: 'r1', endedAt: undefined })];
    const done = lastDone(ws, routines);
    expect(done.get('r1')).toBe(NOW - 3 * DAY);
    expect(done.get('r2')).toBe(NOW - 2 * DAY);
  });

  it('formats short relative days for tight rows', () => {
    expect(shortDay(NOW, NOW)).toBe('today');
    expect(shortDay(NOW - DAY, NOW)).toBe('yesterday');
    expect(shortDay(NOW - 20 * DAY, NOW)).not.toMatch(/,/);
  });
});
