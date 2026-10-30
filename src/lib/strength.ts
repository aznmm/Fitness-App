import type { BodyWeightEntry, Exercise, Muscle, Settings, StrengthGroup, Workout } from '../types';
import { setE1RM, workingSets } from './calc';
import { DAY_MS, addDays, startOfWeek } from './dates';

export const STRENGTH_GROUPS: StrengthGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs'];

export const GROUP_LABELS: Record<StrengthGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
};

export const GROUP_OF_MUSCLE: Record<Muscle, StrengthGroup | null> = {
  chest: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  abs: null,
  cardio: null,
};

/** Female standards as a fraction of the male standard, per group. */
const FEMALE_FACTOR: Record<StrengthGroup, number> = {
  chest: 0.55,
  back: 0.6,
  shoulders: 0.6,
  arms: 0.6,
  legs: 0.72,
};

/** Score earned by lifting exactly the intermediate standard. */
const SCORE_AT_STANDARD = 500;
const MAX_SCORE = 1000;
/** Sets above this many reps make the 1RM estimate too noisy to score. */
const MAX_REPS_FOR_SCORE = 12;
export const SCORE_WINDOW_DAYS = 90;
/** Score that fills a gauge completely (comfortably inside Elite). */
export const GAUGE_MAX = 800;

export interface StrengthLevel {
  name: string;
  min: number;
}

export const LEVELS: StrengthLevel[] = [
  { name: 'Beginner', min: 0 },
  { name: 'Novice', min: 275 },
  { name: 'Intermediate', min: 400 },
  { name: 'Advanced', min: 575 },
  { name: 'Elite', min: 725 },
];

export function levelFor(score: number): StrengthLevel {
  let level = LEVELS[0];
  for (const l of LEVELS) if (score >= l.min) level = l;
  return level;
}

/** Progress (0–1) from the current level's floor to the next one's. */
export function levelProgress(score: number): { level: StrengthLevel; next?: StrengthLevel; progress: number } {
  const level = levelFor(score);
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  if (!next) return { level, progress: 1 };
  return { level, next, progress: (score - level.min) / (next.min - level.min) };
}

/** Intermediate 1RM for this lifter on a scored exercise, in kg. */
export function standardFor(exercise: Exercise, bodyweightKg: number, sex: Settings['sex']): number | undefined {
  const group = GROUP_OF_MUSCLE[exercise.primary];
  if (!exercise.standard || !group) return undefined;
  return exercise.standard * (sex === 'female' ? FEMALE_FACTOR[group] : 1) * bodyweightKg;
}

/** Score for one lift: 500 means the e1RM matches the intermediate standard. */
export function liftScore(e1rm: number, standardKg: number): number {
  return Math.min(MAX_SCORE, (e1rm / standardKg) * SCORE_AT_STANDARD);
}

/** The estimated 1RM (kg) that reaches `score` for a lift with this standard. */
export function e1rmForScore(score: number, standardKg: number): number {
  return (score / SCORE_AT_STANDARD) * standardKg;
}

export interface GroupScore {
  score: number;
  exerciseId: string;
  e1rm: number;
}

export interface StrengthResult {
  overall: number | null;
  groups: Record<StrengthGroup, GroupScore | null>;
  trainedGroups: number;
}

/** Bodyweight on a given day: the latest entry on or before it, else the earliest entry. */
export function bodyweightAt(entries: BodyWeightEntry[], at: number): number | undefined {
  if (!entries.length) return undefined;
  let best: BodyWeightEntry | undefined;
  let earliest = entries[0];
  for (const e of entries) {
    if (e.date < earliest.date) earliest = e;
    if (e.date <= at && (!best || e.date > best.date)) best = e;
  }
  return (best ?? earliest).weight;
}

/**
 * Strength score: for each muscle group, the best estimated 1RM from the last
 * 90 days on any scored lift, relative to bodyweight and that lift's
 * intermediate standard. 500 = intermediate. The overall score averages the
 * groups that have data.
 */
export function computeStrength(
  workouts: Workout[],
  exercisesById: Map<string, Exercise>,
  bodyweightKg: number | undefined,
  sex: Settings['sex'],
  asOf = Date.now(),
): StrengthResult {
  const groups = Object.fromEntries(STRENGTH_GROUPS.map((g) => [g, null])) as Record<StrengthGroup, GroupScore | null>;
  if (!bodyweightKg || bodyweightKg <= 0) return { overall: null, groups, trainedGroups: 0 };

  const since = asOf - SCORE_WINDOW_DAYS * DAY_MS;
  for (const w of workouts) {
    if (!w.endedAt || w.startedAt > asOf || w.startedAt < since) continue;
    for (const we of w.exercises) {
      const ex = exercisesById.get(we.exerciseId);
      if (!ex) continue;
      const group = GROUP_OF_MUSCLE[ex.primary];
      const standard = standardFor(ex, bodyweightKg, sex);
      if (!group || !standard) continue;
      for (const s of workingSets(we.sets)) {
        if ((s.reps ?? 0) > MAX_REPS_FOR_SCORE) continue;
        const e1rm = setE1RM(s, ex.type, bodyweightKg);
        if (!e1rm) continue;
        const score = liftScore(e1rm, standard);
        const cur = groups[group];
        if (!cur || score > cur.score) groups[group] = { score, exerciseId: ex.id, e1rm };
      }
    }
  }

  const scored = STRENGTH_GROUPS.map((g) => groups[g]).filter((g): g is GroupScore => g !== null);
  const overall = scored.length ? scored.reduce((a, g) => a + g.score, 0) / scored.length : null;
  return { overall, groups, trainedGroups: scored.length };
}

export interface StrengthPoint {
  date: number;
  score: number;
}

/** Overall score at the end of each of the last `weeks` weeks (current week included). */
export function strengthHistory(
  workouts: Workout[],
  exercisesById: Map<string, Exercise>,
  bodyweights: BodyWeightEntry[],
  sex: Settings['sex'],
  weeks = 12,
  now = Date.now(),
): StrengthPoint[] {
  const thisWeek = startOfWeek(now);
  const points: StrengthPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeek, -7 * i);
    const end = i === 0 ? now : addDays(weekStart, 7) - 1;
    const r = computeStrength(workouts, exercisesById, bodyweightAt(bodyweights, end), sex, end);
    if (r.overall !== null) points.push({ date: weekStart, score: r.overall });
  }
  return points;
}
