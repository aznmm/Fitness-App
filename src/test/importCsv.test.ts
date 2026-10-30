import { describe, expect, it } from 'vitest';
import { BUILT_IN_EXERCISES } from '../data/exercises';
import {
  buildWorkouts,
  detectColumns,
  guessDateOrder,
  matchExercise,
  missingRequired,
  parseCsv,
  parseDate,
  parseNumber,
  parseWorkoutDuration,
  toAppWorkouts,
  withoutDuplicates,
} from '../lib/importCsv';
import { fromKg } from '../lib/units';

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2023-05-01 18:30:00,"Push Day",1h 5m,"Bench Press (Barbell)",W,95,10,0,0,,,
2023-05-01 18:30:00,"Push Day",1h 5m,"Bench Press (Barbell)",1,185,8,0,0,"felt strong",,
2023-05-01 18:30:00,"Push Day",1h 5m,"Bench Press (Barbell)",2,185,7,0,0,,,
2023-05-01 18:30:00,"Push Day",1h 5m,"Rest Timer",Rest Timer,0,0,0,90,,,
2023-05-01 18:30:00,"Push Day",1h 5m,"Incline Bench Press (Dumbbell)",1,60,10,0,0,,,
2023-05-03 07:00:00,"Run",30m,"Running",1,0,0,5,1800,,,
`;

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Legs","21 Oct 2023, 18:31","21 Oct 2023, 19:40","","Squat (Barbell)",,"",0,"warmup",60,8,,,
"Legs","21 Oct 2023, 18:31","21 Oct 2023, 19:40","","Squat (Barbell)",,"",1,"normal",100,5,,,
"Legs","21 Oct 2023, 18:31","21 Oct 2023, 19:40","","Plank",,"",0,"normal",,,,60,
`;

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, empty lines and CRLF', () => {
    const t = parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n\r\n1,2');
    expect(t.header).toEqual(['a', 'b']);
    expect(t.rows).toEqual([
      ['x, y', 'he said "hi"'],
      ['1', '2'],
    ]);
  });

  it('detects semicolon delimiters', () => {
    expect(parseCsv('Date;Exercise;Reps\n2024-01-01;Squat;5').rows[0]).toEqual(['2024-01-01', 'Squat', '5']);
  });
});

describe('detectColumns', () => {
  it('recognises Strong exports', () => {
    const d = detectColumns(parseCsv(STRONG).header);
    expect(d.format).toBe('strong');
    expect(d.columns).toMatchObject({ date: 0, workoutName: 1, workoutDuration: 2, exercise: 3, setOrder: 4, weight: 5, reps: 6, seconds: 8 });
    expect(d.weightUnit).toBeUndefined();
  });

  it('recognises Hevy exports and their units', () => {
    const d = detectColumns(parseCsv(HEVY).header);
    expect(d.format).toBe('hevy');
    expect(d.weightUnit).toBe('kg');
    expect(d.distanceUnit).toBe('km');
    expect(d.columns).toMatchObject({ date: 1, endTime: 2, exercise: 4, setType: 8, seconds: 12 });
  });

  it('reports missing required columns', () => {
    expect(missingRequired(detectColumns(['When', 'Lift', 'Reps']).columns)).toEqual(['date']);
  });
});

describe('dates and numbers', () => {
  it('parses common date formats without Date.parse', () => {
    expect(new Date(parseDate('2023-05-01 18:30:00')!).getHours()).toBe(18);
    expect(new Date(parseDate('21 Oct 2023, 18:31')!).getMonth()).toBe(9);
    expect(new Date(parseDate('Oct 21, 2023 6:31 PM')!).getHours()).toBe(18);
    expect(new Date(parseDate('10/21/2023')!).getDate()).toBe(21);
    expect(new Date(parseDate('21/10/2023', 'dmy')!).getMonth()).toBe(9);
    expect(parseDate('2023-10-21T18:31:00Z')).toBe(Date.UTC(2023, 9, 21, 18, 31));
    expect(parseDate('not a date')).toBeUndefined();
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseDate('2026-13-45')).toBeUndefined();
    expect(parseDate('2026-02-30 10:00')).toBeUndefined();
    expect(parseDate('31/02/2024', 'dmy')).toBeUndefined();
    expect(parseDate('2024-02-29')).toBeDefined();
  });

  it('guesses day-first files', () => {
    expect(guessDateOrder(['05/03/2024', '21/03/2024'])).toBe('dmy');
    expect(guessDateOrder(['05/03/2024', '03/21/2024'])).toBe('mdy');
  });

  it('parses numbers with units and decimal commas', () => {
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('135 lb')).toBe(135);
    expect(parseNumber('')).toBeUndefined();
  });

  it('parses workout durations', () => {
    expect(parseWorkoutDuration('1h 5m')).toBe(3900);
    expect(parseWorkoutDuration('45m')).toBe(2700);
    expect(parseWorkoutDuration('1:05:00')).toBe(3900);
    expect(parseWorkoutDuration('65')).toBe(3900);
  });
});

describe('buildWorkouts', () => {
  it('groups Strong rows into workouts and skips rest timers', () => {
    const t = parseCsv(STRONG);
    const d = detectColumns(t.header);
    const r = buildWorkouts(t, d.columns, { weightUnit: 'lb', distanceUnit: 'mi', dateOrder: 'mdy' });
    expect(r.workouts).toHaveLength(2);
    expect(r.skippedRows).toBe(0);
    const push = r.workouts[0];
    expect(push.name).toBe('Push Day');
    expect(push.endedAt - push.startedAt).toBe(3900 * 1000);
    expect(push.exercises.map((e) => e.name)).toEqual(['Bench Press (Barbell)', 'Rest Timer', 'Incline Bench Press (Dumbbell)']);
    const bench = push.exercises[0];
    expect(bench.sets.map((s) => s.kind)).toEqual(['warmup', 'normal', 'normal']);
    expect(fromKg(bench.sets[1].weight!, 'lb')).toBeCloseTo(185, 6);
    expect(bench.notes).toBe('felt strong');
    const run = r.workouts[1].exercises[0];
    expect(run.sets[0].distance).toBeCloseTo(5 * 1609.344, 3);
    expect(run.sets[0].duration).toBe(1800);
  });

  it('reads Hevy set types, kg weights and end times', () => {
    const t = parseCsv(HEVY);
    const d = detectColumns(t.header);
    const r = buildWorkouts(t, d.columns, { weightUnit: d.weightUnit!, distanceUnit: d.distanceUnit!, dateOrder: 'mdy' });
    expect(r.workouts).toHaveLength(1);
    const w = r.workouts[0];
    expect(w.endedAt - w.startedAt).toBe(69 * 60000);
    expect(w.exercises[0].sets[0]).toMatchObject({ kind: 'warmup', weight: 60, reps: 8 });
    expect(w.exercises[1].sets[0]).toMatchObject({ duration: 60 });
  });

  it('skips rows with impossible numbers', () => {
    const t = parseCsv('Date,Exercise,Weight,Reps\n2024-01-02,Squat,1e9,5\n2024-01-02,Squat,100,-8\n2024-01-02,Squat,100,5');
    const r = buildWorkouts(t, detectColumns(t.header).columns, { weightUnit: 'kg', distanceUnit: 'km', dateOrder: 'mdy' });
    expect(r.skippedRows).toBe(2);
    expect(r.workouts[0].exercises[0].sets).toHaveLength(1);
  });

  it('counts rows with unreadable dates', () => {
    const t = parseCsv('Date,Exercise,Reps\nyesterday,Squat,5\n2024-01-02,Squat,5');
    const r = buildWorkouts(t, detectColumns(t.header).columns, { weightUnit: 'kg', distanceUnit: 'km', dateOrder: 'mdy' });
    expect(r.badDates).toBe(1);
    expect(r.workouts).toHaveLength(1);
  });
});

describe('matchExercise', () => {
  const lib = BUILT_IN_EXERCISES;
  const id = (name: string) => matchExercise(name, lib).exercise?.id;

  it('matches app-style names with equipment in brackets', () => {
    expect(id('Bench Press (Barbell)')).toBe('bench-press');
    expect(id('Squat (Barbell)')).toBe('squat');
    expect(id('Bicep Curl (Dumbbell)')).toBe('db-curl');
    expect(id('Bicep Curl (Barbell)')).toBe('barbell-curl');
    expect(id('Pull Up')).toBe('pull-up');
    expect(id('Lat Pulldown (Cable)')).toBe('lat-pulldown');
    expect(id('Seated Row (Cable)')).toBe('seated-cable-row');
    expect(id('Shoulder Press (Dumbbell)')).toBe('db-shoulder-press');
    expect(id('Incline Bench Press (Dumbbell)')).toBe('incline-db-press');
    expect(id('Romanian Deadlift (Barbell)')).toBe('romanian-deadlift');
    expect(id('Leg Press')).toBe('leg-press');
  });

  it('flags confidence', () => {
    expect(matchExercise('bench press', lib).confidence).toBe('exact');
    expect(matchExercise('Triceps Pushdown (Cable - Straight Bar)', lib)).toMatchObject({ confidence: 'fuzzy' });
    expect(matchExercise('Zercher Carry', lib).confidence).toBe('none');
  });
});

describe('toAppWorkouts + dedupe', () => {
  it('creates done sets and skips workouts that already exist', () => {
    const t = parseCsv(STRONG);
    const r = buildWorkouts(t, detectColumns(t.header).columns, { weightUnit: 'lb', distanceUnit: 'mi', dateOrder: 'mdy' });
    const ws = toAppWorkouts(r.workouts, (n) => matchExercise(n, BUILT_IN_EXERCISES).exercise?.id ?? 'custom');
    expect(ws[0].exercises[0].exerciseId).toBe('bench-press');
    expect(ws[0].exercises[0].sets.every((s) => s.done)).toBe(true);
    expect(withoutDuplicates(ws, [ws[0]])).toHaveLength(1);
  });
});
