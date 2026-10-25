import { describe, expect, it } from 'vitest';
import { setsPerMuscle, weekStreak, weeklyStats } from '../lib/stats';
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
