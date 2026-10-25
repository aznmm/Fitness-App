import { describe, expect, it } from 'vitest';
import { platesPerSide, suggestNext, warmupSets, weightIncrement } from '../lib/progression';
import { fromKg, toKg } from '../lib/units';
import { byId, DAY, NOW, set, workout } from './helpers';

const bench = byId.get('bench-press')!;
const squat = byId.get('squat')!;
const pullup = byId.get('pull-up')!;
const plank = byId.get('plank')!;
const lb = (n: number) => toKg(n, 'lb');

describe('suggestNext', () => {
  it('returns nothing without history or a routine target', () => {
    expect(suggestNext(bench, [], NOW, 'lb')).toBeNull();
  });

  it('uses the routine target on a first session', () => {
    expect(suggestNext(bench, [], NOW, 'lb', { reps: 8 })).toMatchObject({ reps: 8, reason: 'routine' });
  });

  it('adds weight once every set hits the target reps', () => {
    const w = workout(NOW - 3 * DAY, { 'bench-press': [set(lb(60), 10, { kind: 'warmup' }), set(lb(200), 8), set(lb(200), 8), set(lb(200), 8)] });
    const s = suggestNext(bench, [w], NOW, 'lb')!;
    expect(s.reason).toBe('increase');
    expect(fromKg(s.weight!, 'lb')).toBeCloseTo(205, 6);
    expect(s.reps).toBe(8);
  });

  it('uses bigger jumps for lower-body barbell lifts and metric steps in kg', () => {
    expect(weightIncrement(squat, 'lb')).toBe(10);
    expect(weightIncrement(bench, 'kg')).toBe(2.5);
    const w = workout(NOW - DAY, { squat: [set(100, 5), set(100, 5)] });
    expect(suggestNext(squat, [w], NOW, 'kg')!.weight).toBeCloseTo(105, 6);
  });

  it('repeats the weight when reps were missed', () => {
    const w = workout(NOW - DAY, { 'bench-press': [set(lb(200), 8), set(lb(200), 7)] });
    expect(suggestNext(bench, [w], NOW, 'lb')).toMatchObject({ reason: 'repeat', weight: lb(200), reps: 8 });
  });

  it('prefers the routine rep target over last session reps', () => {
    const w = workout(NOW - DAY, { 'bench-press': [set(lb(200), 10), set(lb(200), 10)] });
    expect(suggestNext(bench, [w], NOW, 'lb', { reps: 12 })).toMatchObject({ reason: 'repeat', reps: 12 });
  });

  it('suggests a deload after three stalled sessions', () => {
    const stalled = [7, 5, 3].map((d) => workout(NOW - d * DAY, { 'bench-press': [set(lb(200), 8), set(lb(200), 6)] }));
    const s = suggestNext(bench, stalled, NOW, 'lb')!;
    expect(s.reason).toBe('deload');
    expect(fromKg(s.weight!, 'lb')).toBeCloseTo(180, 6);
  });

  it('only looks at sessions before the current workout', () => {
    const future = workout(NOW + DAY, { 'bench-press': [set(lb(300), 8)] });
    const past = workout(NOW - DAY, { 'bench-press': [set(lb(200), 8)] });
    expect(fromKg(suggestNext(bench, [past, future], NOW, 'lb')!.weight!, 'lb')).toBeCloseTo(205, 6);
  });

  it('asks for one more rep on bodyweight lifts and longer holds on timed ones', () => {
    const w = workout(NOW - DAY, { 'pull-up': [set(undefined, 9), set(undefined, 7)], plank: [set(undefined, undefined, { duration: 45 })] });
    expect(suggestNext(pullup, [w], NOW, 'lb')).toMatchObject({ reps: 10, reason: 'more-reps' });
    expect(suggestNext(plank, [w], NOW, 'lb')).toMatchObject({ duration: 50, reason: 'longer' });
  });
});

describe('warmupSets', () => {
  it('ramps up from the empty bar for barbell lifts', () => {
    const sets = warmupSets(bench, lb(225), 'lb', lb(45));
    expect(sets.map((s) => Math.round(fromKg(s.weight!, 'lb')))).toEqual([45, 115, 160, 190]);
    expect(sets.map((s) => s.reps)).toEqual([10, 5, 3, 1]);
  });

  it('skips steps that would be lighter than the bar or too close together', () => {
    const sets = warmupSets(bench, lb(65), 'lb', lb(45));
    const weights = sets.map((s) => Math.round(fromKg(s.weight!, 'lb')));
    expect(weights.every((w) => w >= 45 && w < 65)).toBe(true);
    expect(new Set(weights).size).toBe(weights.length);
  });

  it('uses a two-step ramp for dumbbells', () => {
    const db = byId.get('db-bench-press')!;
    expect(warmupSets(db, 30, 'kg', 20).map((s) => s.weight)).toEqual([16, 22]);
  });
});

describe('platesPerSide', () => {
  it('loads standard plates heaviest first', () => {
    expect(platesPerSide(225, 45, 'lb')).toEqual({ plates: [45, 45], loaded: 225, exact: true });
    expect(platesPerSide(100, 20, 'kg').plates).toEqual([25, 15]);
  });

  it('reports when a weight cannot be made exactly', () => {
    const r = platesPerSide(137, 45, 'lb');
    expect(r.exact).toBe(false);
    expect(r.loaded).toBe(135);
  });

  it('handles weights at or below the bar', () => {
    expect(platesPerSide(45, 45, 'lb')).toMatchObject({ plates: [], exact: true });
    expect(platesPerSide(30, 45, 'lb')).toMatchObject({ plates: [], loaded: 45 });
  });
});
