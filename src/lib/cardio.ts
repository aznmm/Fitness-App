import type { Exercise, Unit, WorkoutSet } from '../types';
import { formatDuration, trimNumber } from './units';

const M_PER_MI = 1609.344;
const M_PER_YD = 0.9144;

export interface DistanceSpec {
  label: 'mi' | 'km' | 'm' | 'yd';
  /** Metres in one displayed unit. */
  metres: number;
}

/**
 * How an exercise's distance is entered and shown: miles or km for most cardio,
 * metres for rowing and sprints, and yards or metres (by unit system) for swimming.
 */
export function distanceSpec(exercise: Pick<Exercise, 'distanceScale'> | undefined, unit: Unit): DistanceSpec {
  switch (exercise?.distanceScale) {
    case 'metres':
      return { label: 'm', metres: 1 };
    case 'pool':
      return unit === 'lb' ? { label: 'yd', metres: M_PER_YD } : { label: 'm', metres: 1 };
    default:
      return unit === 'lb' ? { label: 'mi', metres: M_PER_MI } : { label: 'km', metres: 1000 };
  }
}

/** A timed or distance cardio exercise (run, row, bike), as opposed to lifting. */
export function isCardio(exercise: Pick<Exercise, 'primary' | 'type'> | undefined): boolean {
  return exercise?.primary === 'cardio' && (exercise.type === 'duration' || exercise.type === 'distance_duration');
}

export function formatCardioDistance(m: number, spec: DistanceSpec): string {
  return `${trimNumber(m / spec.metres, spec.metres === 1 || spec.label === 'yd' ? 0 : 2)} ${spec.label}`;
}

/**
 * The headline rate for a cardio set: pace ("9:02 /mi"), speed ("18.4 mph"),
 * a rowing split ("1:52 /500m") or a swim split ("1:45 /100yd").
 */
export function cardioRate(set: Pick<WorkoutSet, 'distance' | 'duration'>, exercise: Pick<Exercise, 'metric' | 'distanceScale'>, unit: Unit): string | null {
  const { distance, duration } = set;
  if (!distance || !duration || distance <= 0 || duration <= 0) return null;
  switch (exercise.metric ?? 'pace') {
    case 'speed': {
      const perHour = (distance / (unit === 'lb' ? M_PER_MI : 1000)) / (duration / 3600);
      return `${trimNumber(perHour, 1)} ${unit === 'lb' ? 'mph' : 'km/h'}`;
    }
    case 'split500':
      return `${formatDuration(Math.round(duration / (distance / 500)))} /500m`;
    case 'split100': {
      const spec = distanceSpec({ distanceScale: 'pool' }, unit);
      return `${formatDuration(Math.round(duration / (distance / (100 * spec.metres))))} /100${spec.label}`;
    }
    default: {
      const per = unit === 'lb' ? M_PER_MI : 1000;
      return `${formatDuration(Math.round(duration / (distance / per)))} /${unit === 'lb' ? 'mi' : 'km'}`;
    }
  }
}
