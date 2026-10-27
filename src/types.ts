export type Unit = 'lb' | 'kg';

export type Muscle =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'cardio';

/** The five groups the strength score is built from. */
export type StrengthGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

/**
 * How a set of the exercise is recorded.
 * - weight_reps: load × reps (bench press)
 * - reps: bodyweight reps, optional added load (pull-up)
 * - duration: hold time (plank)
 * - distance_duration: distance + time (run)
 */
export type ExerciseType = 'weight_reps' | 'reps' | 'duration' | 'distance_duration';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  type: ExerciseType;
  /**
   * Intermediate-level one-rep max as a multiple of bodyweight (male standard).
   * Only set for lifts that count toward the strength score. For dumbbell lifts
   * the standard is per dumbbell; for `reps` lifts it is total load (bodyweight + added).
   */
  standard?: number;
  custom?: boolean;
  /** Last local change (ms), used to merge synced copies. */
  updatedAt?: number;
}

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  kind: SetKind;
  /** Load in kg. For `reps` exercises this is the *added* load. */
  weight?: number;
  reps?: number;
  /** Seconds. */
  duration?: number;
  /** Metres. */
  distance?: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  /** Rest after each set, in seconds. Falls back to the default rest setting. */
  restSec?: number;
  /** Goal carried over from the routine; shown when there is no previous performance. */
  target?: { reps?: number; weight?: number };
}

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  routineId?: string;
  updatedAt?: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  /** Suggested load in kg. */
  weight?: number;
  restSec?: number;
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
  createdAt: number;
  lastUsedAt?: number;
  updatedAt?: number;
}

export interface BodyWeightEntry {
  id: string;
  date: number;
  /** kg */
  weight: number;
  updatedAt?: number;
}

/**
 * A routine planned for a day. A `date` plan covers one day; a `weekday` plan
 * repeats every week from today on. A date plan overrides the weekly one, and
 * `routineId: null` means nothing is planned (e.g. skipping one week).
 */
export interface Plan {
  /** `date:YYYY-MM-DD` or `weekday:N`, so each slot has one record. */
  id: string;
  /** Local date, YYYY-MM-DD. */
  date?: string;
  /** 0 = Monday … 6 = Sunday. */
  weekday?: number;
  routineId: string | null;
  updatedAt?: number;
}

/** Step count for one day. */
export interface StepEntry {
  /** `steps:YYYY-MM-DD`. */
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  count: number;
  source: 'health' | 'manual';
  updatedAt?: number;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  unit: Unit;
  sex: 'male' | 'female';
  defaultRestSec: number;
  autoRestTimer: boolean;
  restSound: boolean;
  theme: Theme;
  weeklyGoal: number;
  /** Show a suggested target (weight × reps) for each exercise. */
  smartSuggestions: boolean;
  /** Empty barbell weight in kg; defaults to 45 lb / 20 kg for the unit. */
  barKg?: number;
  /** Daily step goal. */
  stepGoal: number;
}

export interface RestTimer {
  endsAt: number;
  totalSec: number;
}
