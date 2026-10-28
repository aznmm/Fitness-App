import { describe, expect, it } from 'vitest';
import { BUILT_IN_EXERCISES } from '../data/exercises';
import { recordsFromSessions, setVolume } from '../lib/calc';
import { cardioRate, distanceSpec, formatCardioDistance } from '../lib/cardio';
import { suggestNext } from '../lib/progression';
import { byId, NOW, set, workout } from './helpers';

const ex = (id: string) => BUILT_IN_EXERCISES.find((e) => e.id === id)!;

describe('cardio', () => {
  it('shows pace, speed and splits the way each sport reads them', () => {
    expect(cardioRate({ distance: 5000, duration: 25 * 60 }, ex('running'), 'kg')).toBe('5:00 /km');
    expect(cardioRate({ distance: 1609.344 * 3, duration: 27 * 60 }, ex('running'), 'lb')).toBe('9:00 /mi');
    expect(cardioRate({ distance: 1609.344 * 10, duration: 30 * 60 }, ex('cycling'), 'lb')).toBe('20 mph');
    expect(cardioRate({ distance: 2000, duration: 8 * 60 }, ex('rowing-machine'), 'lb')).toBe('2:00 /500m');
    expect(cardioRate({ distance: 0.9144 * 500, duration: 10 * 60 }, ex('swimming'), 'lb')).toBe('2:00 /100yd');
    expect(cardioRate({ distance: 1000 }, ex('running'), 'kg')).toBeNull();
  });

  it('enters rowing in metres and swimming in yards or metres', () => {
    expect(distanceSpec(ex('rowing-machine'), 'lb').label).toBe('m');
    expect(distanceSpec(ex('swimming'), 'lb').label).toBe('yd');
    expect(distanceSpec(ex('swimming'), 'kg').label).toBe('m');
    expect(distanceSpec(ex('running'), 'lb').label).toBe('mi');
    expect(formatCardioDistance(2000, distanceSpec(ex('rowing-machine'), 'lb'))).toBe('2000 m');
  });

  it('keeps the fastest set as the best', () => {
    const slow = set(undefined, undefined, { distance: 5000, duration: 1800 });
    const fast = set(undefined, undefined, { distance: 5000, duration: 1500 });
    const r = recordsFromSessions([{ workoutId: 'w', date: NOW, sets: [slow, fast] }], 'distance_duration');
    expect(r.bestRateSet).toBe(fast);
  });

  it('logs every cardio activity by time, or by distance and time', () => {
    const cardio = BUILT_IN_EXERCISES.filter((e) => e.primary === 'cardio' && e.type !== 'reps');
    expect(cardio.length).toBeGreaterThanOrEqual(25);
    for (const e of cardio) expect(['duration', 'distance_duration']).toContain(e.type);
    expect(suggestNext(ex('hiit'), [workout(NOW - 86_400_000, { hiit: [set(undefined, undefined, { duration: 1200 })] })], NOW, 'lb')).toBeNull();
  });
});

describe('assisted machines', () => {
  it('stores assistance as negative weight that adds no volume', () => {
    expect(setVolume(set(-30, 8))).toBe(0);
    const r = recordsFromSessions([{ workoutId: 'w', date: NOW, sets: [set(-40, 8), set(-30, 6)] }], 'reps', 80);
    expect(r.leastAssist).toBe(-30);
    expect(r.bestE1RM).toBeGreaterThan(0);
  });

  it('suggests last time’s lowest assistance and one more rep', () => {
    const history = [workout(NOW - 86_400_000, { 'assisted-pull-up': [set(-40, 8), set(-30, 6)] })];
    expect(suggestNext(byId.get('assisted-pull-up')!, history, NOW, 'kg')).toMatchObject({ weight: -30, reps: 9 });
  });

  it('has unique ids across the whole library', () => {
    const ids = BUILT_IN_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BUILT_IN_EXERCISES.filter((e) => e.assisted).every((e) => e.type === 'reps')).toBe(true);
  });
});
