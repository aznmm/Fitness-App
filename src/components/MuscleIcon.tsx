import {
  Backpack,
  Bike,
  Flame,
  Footprints,
  Goal,
  Hand,
  HeartPulse,
  Mountain,
  Music,
  Route,
  Sailboat,
  Snowflake,
  Spline,
  TrendingUp,
  Volleyball,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Exercise, Muscle } from '../types';
import { BACK, BACK_SILHOUETTE, FRONT, SILHOUETTE } from './BodyMap';

type View = { back: boolean; x: number; y: number; size: number };

/** Which side of the body to show, and a square crop around the muscle. */
const VIEWS: Record<Exclude<Muscle, 'cardio'>, View> = {
  chest: { back: false, x: 50, y: 50, size: 100 },
  shoulders: { back: false, x: 36, y: 34, size: 128 },
  biceps: { back: false, x: 18, y: 90, size: 86 },
  forearms: { back: false, x: 12, y: 140, size: 90 },
  abs: { back: false, x: 52, y: 110, size: 96 },
  quads: { back: false, x: 40, y: 206, size: 120 },
  traps: { back: true, x: 50, y: 28, size: 100 },
  lats: { back: true, x: 44, y: 62, size: 112 },
  back: { back: true, x: 50, y: 106, size: 100 },
  triceps: { back: true, x: 18, y: 90, size: 86 },
  glutes: { back: true, x: 46, y: 178, size: 108 },
  hamstrings: { back: true, x: 40, y: 228, size: 120 },
  calves: { back: true, x: 44, y: 318, size: 112 },
};

/** Activity icons for cardio, by exercise id. */
const CARDIO_ICONS: [RegExp, LucideIcon][] = [
  [/walk/, Footprints],
  [/sprint/, Zap],
  [/hik|trail/, Mountain],
  [/ruck/, Backpack],
  [/run|jog|treadmill/, Route],
  [/bik|cycl|spin/, Bike],
  [/swim/, Waves],
  [/row|kayak/, Sailboat],
  [/ski/, Snowflake],
  [/stair/, TrendingUp],
  [/ellip|rope/, Spline],
  [/box/, Hand],
  [/dance/, Music],
  [/soccer/, Goal],
  [/basketball|tennis|pickleball/, Volleyball],
  [/hiit|burpee|battle/, Flame],
];

export function cardioIcon(id: string): LucideIcon {
  return CARDIO_ICONS.find(([re]) => re.test(id))?.[1] ?? HeartPulse;
}

/**
 * The part of the body a muscle sits on, with that muscle filled in its group
 * colour (`--tile`) and any secondary muscles in a lighter tint.
 */
export function MuscleIcon({ muscle, secondary = [], size = 30 }: { muscle: Muscle; secondary?: Muscle[]; size?: number }) {
  if (muscle === 'cardio') return <HeartPulse size={size * 0.7} />;
  const view = VIEWS[muscle];
  const regions = view.back ? BACK : FRONT;
  const silhouette = view.back ? BACK_SILHOUETTE : SILHOUETTE;
  const fill = (m: Muscle) => (m === muscle ? 'var(--tile)' : secondary.includes(m) ? 'color-mix(in srgb, var(--tile) 40%, transparent)' : 'var(--fill-strong)');
  const side = (mirror: boolean) => (
    <g transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
      {silhouette.map((d, i) => (
        <path key={`s${i}`} d={d} fill="var(--fill)" />
      ))}
      {regions.map((r, i) => (
        <path key={i} d={r.d} fill={fill(r.muscle)} />
      ))}
    </g>
  );
  return (
    <svg className="muscle-icon" width={size} height={size} viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`} aria-hidden>
      {side(false)}
      {side(true)}
    </svg>
  );
}

/** Tile content for an exercise: its main muscle, or an activity icon for cardio. */
export function ExerciseIcon({ exercise, size = 30 }: { exercise?: Pick<Exercise, 'id' | 'primary' | 'secondary'>; size?: number }) {
  if (!exercise) return <HeartPulse size={size * 0.7} />;
  if (exercise.primary === 'cardio') {
    const Icon = cardioIcon(exercise.id);
    return <Icon size={size * 0.7} strokeWidth={2.2} />;
  }
  return <MuscleIcon muscle={exercise.primary} secondary={exercise.secondary} size={size} />;
}
