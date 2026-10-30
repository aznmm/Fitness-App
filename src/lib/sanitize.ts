import type { AppData } from '../store/useStore';
import type {
  BodyWeightEntry,
  Equipment,
  Exercise,
  ExerciseType,
  Muscle,
  Plan,
  Routine,
  RoutineExercise,
  SetKind,
  StepEntry,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types';
import { uid } from './id';
import { LIMITS } from './limits';

/**
 * Backups, synced copies and saved state come from outside the running app,
 * so a damaged file must not crash every screen. These turn whatever was read
 * into well-formed records: required fields filled in, junk numbers dropped,
 * and records without an id left out.
 */

type Raw = Record<string, unknown>;

const isObj = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);
const id = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);
/** A finite number within ±max, else undefined. */
const num = (x: unknown, max: number, min = -max): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : undefined);
const time = (x: unknown) => num(x, 8.64e15, 0);
const list = <T>(x: unknown, clean: (r: Raw) => T | null): T[] => (Array.isArray(x) ? x.flatMap((r) => (isObj(r) ? (clean(r) ?? []) : [])) : []);
/** Drops keys whose value is undefined, so cleaned records look like saved ones. */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

const SET_KINDS: SetKind[] = ['normal', 'warmup', 'drop', 'failure'];
const TYPES: ExerciseType[] = ['weight_reps', 'reps', 'duration', 'distance_duration'];
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'];
const MUSCLES: Muscle[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'cardio',
];
const oneOf = <T extends string>(x: unknown, options: T[], fallback: T): T => (options.includes(x as T) ? (x as T) : fallback);

function cleanSet(r: Raw): WorkoutSet {
  return compact({
    id: id(r.id) ?? uid(),
    kind: oneOf(r.kind, SET_KINDS, 'normal'),
    weight: num(r.weight, LIMITS.weightKg),
    reps: num(r.reps, LIMITS.reps, 0),
    duration: num(r.duration, LIMITS.durationSec, 0),
    distance: num(r.distance, LIMITS.distanceM, 0),
    calories: num(r.calories, LIMITS.calories, 0),
    done: r.done === true,
  });
}

function cleanWorkoutExercise(r: Raw): WorkoutExercise | null {
  const exerciseId = id(r.exerciseId);
  if (!exerciseId) return null;
  const target = isObj(r.target)
    ? compact({
        reps: num(r.target.reps, LIMITS.reps, 0),
        weight: num(r.target.weight, LIMITS.weightKg),
      })
    : undefined;
  return compact({
    id: id(r.id) ?? uid(),
    exerciseId,
    sets: list(r.sets, cleanSet),
    notes: str(r.notes),
    restSec: num(r.restSec, LIMITS.durationSec, 0),
    target,
  });
}

export function cleanWorkout(r: Raw): Workout | null {
  const wid = id(r.id);
  const startedAt = time(r.startedAt);
  if (!wid || startedAt === undefined) return null;
  return compact({
    id: wid,
    name: str(r.name) || 'Workout',
    startedAt,
    endedAt: time(r.endedAt),
    exercises: list(r.exercises, cleanWorkoutExercise),
    notes: str(r.notes),
    routineId: id(r.routineId),
    updatedAt: time(r.updatedAt),
  });
}

function cleanRoutineExercise(r: Raw): RoutineExercise | null {
  const exerciseId = id(r.exerciseId);
  if (!exerciseId) return null;
  return compact({
    id: id(r.id) ?? uid(),
    exerciseId,
    sets: Math.round(num(r.sets, 99, 0) ?? 3),
    reps: num(r.reps, LIMITS.reps, 0),
    weight: num(r.weight, LIMITS.weightKg),
    restSec: num(r.restSec, LIMITS.durationSec, 0),
  });
}

function cleanRoutine(r: Raw): Routine | null {
  const rid = id(r.id);
  if (!rid) return null;
  return compact({
    id: rid,
    name: str(r.name) || 'Routine',
    notes: str(r.notes),
    exercises: list(r.exercises, cleanRoutineExercise),
    createdAt: time(r.createdAt) ?? 0,
    lastUsedAt: time(r.lastUsedAt),
    updatedAt: time(r.updatedAt),
  });
}

function cleanExercise(r: Raw): Exercise | null {
  const eid = id(r.id);
  if (!eid) return null;
  return compact({
    ...(r as Partial<Exercise>),
    id: eid,
    name: str(r.name) || 'Exercise',
    primary: oneOf(r.primary, MUSCLES, 'abs'),
    secondary: Array.isArray(r.secondary) ? r.secondary.filter((m): m is Muscle => MUSCLES.includes(m as Muscle)) : [],
    equipment: oneOf(r.equipment, EQUIPMENT, 'other'),
    type: oneOf(r.type, TYPES, 'weight_reps'),
    updatedAt: time(r.updatedAt),
  });
}

function cleanBodyweight(r: Raw): BodyWeightEntry | null {
  const bid = id(r.id);
  const date = time(r.date);
  const weight = num(r.weight, LIMITS.weightKg, 0);
  if (!bid || date === undefined || !weight) return null;
  return compact({ id: bid, date, weight, updatedAt: time(r.updatedAt) });
}

function cleanPlan(r: Raw): Plan | null {
  const pid = id(r.id);
  if (!pid) return null;
  const date = str(r.date);
  const weekday = num(r.weekday, 6, 0);
  if (!date && weekday === undefined) return null;
  return compact({
    id: pid,
    date,
    weekday,
    routineId: id(r.routineId) ?? null,
    updatedAt: time(r.updatedAt),
  });
}

function cleanSteps(r: Raw): StepEntry | null {
  const sid = id(r.id);
  const date = str(r.date);
  const count = num(r.count, LIMITS.steps, 0);
  if (!sid || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || count === undefined) return null;
  return compact({
    id: sid,
    date,
    count,
    source: r.source === 'health' ? ('health' as const) : ('manual' as const),
    updatedAt: time(r.updatedAt),
  });
}

function cleanTombstones(x: unknown): Record<string, number> {
  if (!isObj(x)) return {};
  return Object.fromEntries(Object.entries(x).filter((e): e is [string, number] => time(e[1]) !== undefined));
}

/** Well-formed copies of the records in `d`; fields that weren't there stay absent. */
export function cleanData(d: unknown): Partial<AppData> {
  if (!isObj(d)) return {};
  const out: Partial<AppData> = {};
  if ('workouts' in d) out.workouts = list(d.workouts, cleanWorkout);
  if ('routines' in d) out.routines = list(d.routines, cleanRoutine);
  if ('customExercises' in d) out.customExercises = list(d.customExercises, cleanExercise);
  if ('bodyweights' in d) out.bodyweights = list(d.bodyweights, cleanBodyweight);
  if ('plans' in d) out.plans = list(d.plans, cleanPlan);
  if ('steps' in d) out.steps = list(d.steps, cleanSteps);
  if ('active' in d) out.active = isObj(d.active) ? cleanWorkout(d.active) : null;
  if ('settings' in d && isObj(d.settings)) {
    // Only plain values; the store fills in defaults for anything missing.
    const plain = Object.entries(d.settings).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v));
    out.settings = Object.fromEntries(plain) as unknown as AppData['settings'];
  }
  if ('settingsUpdatedAt' in d) out.settingsUpdatedAt = time(d.settingsUpdatedAt) ?? 0;
  if ('deleted' in d) out.deleted = cleanTombstones(d.deleted);
  if ('rest' in d) {
    const rest = isObj(d.rest)
      ? {
          endsAt: time(d.rest.endsAt),
          totalSec: num(d.rest.totalSec, LIMITS.durationSec, 0),
        }
      : null;
    out.rest = rest?.endsAt && rest.totalSec ? { endsAt: rest.endsAt, totalSec: rest.totalSec } : null;
  }
  return out;
}
