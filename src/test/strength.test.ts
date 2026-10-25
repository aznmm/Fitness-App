import { describe, expect, it } from 'vitest';
import { estimate1RM } from '../lib/calc';
import { bodyweightAt, computeStrength, levelFor, strengthHistory } from '../lib/strength';
import { byId, DAY, NOW, set, workout } from './helpers';

const BW = 80;

describe('computeStrength', () => {
  it('needs a bodyweight', () => {
    const w = workout(NOW - DAY, { 'bench-press': [set(92, 1)] });
    expect(computeStrength([w], byId, undefined, 'male', NOW).overall).toBeNull();
  });

  it('scores 500 when a lift matches the intermediate standard', () => {
    // Bench standard is 1.15 × bodyweight.
    const w = workout(NOW - DAY, { 'bench-press': [set(BW * 1.15, 1)] });
    const r = computeStrength([w], byId, BW, 'male', NOW);
    expect(r.groups.chest?.score).toBeCloseTo(500, 5);
    expect(r.overall).toBeCloseTo(500, 5);
    expect(r.trainedGroups).toBe(1);
  });

  it('uses lower standards for female lifters', () => {
    const w = workout(NOW - DAY, { 'bench-press': [set(BW * 1.15 * 0.55, 1)] });
    expect(computeStrength([w], byId, BW, 'female', NOW).groups.chest?.score).toBeCloseTo(500, 5);
  });

  it('takes the best lift per group and averages groups', () => {
    const w = workout(NOW - DAY, {
      'bench-press': [set(BW * 1.15, 1)],
      'db-bench-press': [set(BW * 0.42 * 1.2, 1)], // 600 — beats the barbell bench
      squat: [set(BW * 1.5 * 0.8, 1)], // 400
    });
    const r = computeStrength([w], byId, BW, 'male', NOW);
    expect(r.groups.chest?.exerciseId).toBe('db-bench-press');
    expect(r.groups.chest?.score).toBeCloseTo(600, 5);
    expect(r.overall).toBeCloseTo(500, 5);
  });

  it('ignores warm-ups, high-rep sets and old workouts', () => {
    const w = workout(NOW - DAY, {
      'bench-press': [set(200, 1, { kind: 'warmup' }), set(60, 20)],
    });
    const old = workout(NOW - 120 * DAY, { squat: [set(200, 1)] });
    expect(computeStrength([w, old], byId, BW, 'male', NOW).overall).toBeNull();
  });

  it('adds bodyweight for bodyweight lifts', () => {
    const w = workout(NOW - DAY, { 'pull-up': [set(undefined, 10)] });
    const r = computeStrength([w], byId, BW, 'male', NOW);
    expect(r.groups.back?.e1rm).toBeCloseTo(estimate1RM(BW, 10), 5);
  });
});

describe('levels and history', () => {
  it('maps scores to levels', () => {
    expect(levelFor(0).name).toBe('Beginner');
    expect(levelFor(450).name).toBe('Intermediate');
    expect(levelFor(900).name).toBe('Elite');
  });

  it('looks up bodyweight on a date', () => {
    const entries = [
      { id: 'a', date: NOW - 10 * DAY, weight: 80 },
      { id: 'b', date: NOW - 2 * DAY, weight: 82 },
    ];
    expect(bodyweightAt(entries, NOW)).toBe(82);
    expect(bodyweightAt(entries, NOW - 5 * DAY)).toBe(80);
    expect(bodyweightAt(entries, NOW - 30 * DAY)).toBe(80);
    expect(bodyweightAt([], NOW)).toBeUndefined();
  });

  it('builds weekly score history', () => {
    const ws = [workout(NOW - 15 * DAY, { 'bench-press': [set(BW * 1.15, 1)] }), workout(NOW - DAY, { 'bench-press': [set(BW * 1.15 * 1.2, 1)] })];
    const points = strengthHistory(ws, byId, [{ id: 'x', date: NOW - 60 * DAY, weight: BW }], 'male', 4, NOW);
    expect(points.length).toBe(3);
    expect(points[0].score).toBeCloseTo(500, 5);
    expect(points[points.length - 1].score).toBeCloseTo(600, 5);
  });
});
