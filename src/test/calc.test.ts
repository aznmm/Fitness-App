import { describe, expect, it } from 'vitest';
import {
  estimate1RM,
  exerciseRecords,
  lastPerformance,
  repMaxes,
  exerciseSessions,
  setPRs,
  workoutPRs,
  workoutSetCount,
  workoutVolume,
} from '../lib/calc';
import { byId, DAY, NOW, set, workout } from './helpers';

const bench = byId.get('bench-press')!;

describe('estimate1RM', () => {
  it('uses Epley and returns the weight for singles', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe('workout totals', () => {
  it('ignore warm-ups and unfinished sets', () => {
    const w = workout(NOW, {
      'bench-press': [set(40, 10, { kind: 'warmup' }), set(100, 5), set(100, 5), set(100, 5, { done: false })],
    });
    expect(workoutVolume(w)).toBe(1000);
    expect(workoutSetCount(w)).toBe(2);
  });
});

describe('history lookups', () => {
  const older = workout(NOW - 7 * DAY, { 'bench-press': [set(90, 5), set(90, 5)] });
  const newer = workout(NOW - 2 * DAY, { 'bench-press': [set(95, 5)], squat: [set(140, 5)] });
  const active = { ...workout(NOW, { 'bench-press': [set(100, 5)] }), endedAt: undefined };

  it('finds the latest finished performance before a time', () => {
    expect(lastPerformance([older, newer, active], 'bench-press').map((s) => s.weight)).toEqual([95]);
    expect(lastPerformance([older, newer], 'bench-press', NOW - 3 * DAY).map((s) => s.weight)).toEqual([90, 90]);
    expect(lastPerformance([older], 'deadlift')).toEqual([]);
  });

  it('only includes finished workouts in sessions', () => {
    expect(exerciseSessions([older, newer, active], 'bench-press')).toHaveLength(2);
  });

  it('builds a rep max table', () => {
    const sessions = exerciseSessions([older, newer], 'bench-press');
    const table = repMaxes(sessions, [1, 5, 8]);
    expect(table.map((r) => r.weight)).toEqual([95, 95, 0]);
  });
});

describe('personal records', () => {
  const prev = workout(NOW - 7 * DAY, { 'bench-press': [set(100, 5)] });

  it('never flags a first-ever session', () => {
    const records = exerciseRecords([], bench);
    expect(setPRs(set(200, 5), 'weight_reps', records)).toEqual([]);
  });

  it('flags weight and estimated-1RM PRs', () => {
    const records = exerciseRecords([prev], bench);
    expect(setPRs(set(105, 5), 'weight_reps', records)).toEqual(['e1rm', 'weight']);
    expect(setPRs(set(100, 8), 'weight_reps', records)).toEqual(['e1rm']);
    expect(setPRs(set(100, 5), 'weight_reps', records)).toEqual([]);
    expect(setPRs(set(150, 5, { kind: 'warmup' }), 'weight_reps', records)).toEqual([]);
  });

  it('reports one PR per kind per exercise for a workout', () => {
    const today = workout(NOW, { 'bench-press': [set(102.5, 5), set(105, 5), set(80, 12)] });
    const prs = workoutPRs(today, [prev, today], byId);
    const kinds = prs.map((p) => `${p.kind}:${p.set.weight}`).sort();
    expect(kinds).toEqual(['e1rm:105', 'weight:105']);
  });

  it('measures only against workouts that came before', () => {
    const later = workout(NOW + DAY, { 'bench-press': [set(200, 5)] });
    const today = workout(NOW, { 'bench-press': [set(105, 5)] });
    expect(workoutPRs(today, [prev, today, later], byId)).toHaveLength(2);
  });
});
