import type { Equipment, Exercise, ExerciseType, Muscle } from '../types';

type Opts = Partial<Pick<Exercise, 'standard' | 'assisted' | 'metric' | 'distanceScale'>> & { type?: ExerciseType };

function ex(id: string, name: string, primary: Muscle, secondary: Muscle[], equipment: Equipment, opts: Opts = {}): Exercise {
  const { type = 'weight_reps', ...rest } = opts;
  const out: Exercise = { id, name, primary, secondary, equipment, type };
  for (const [k, v] of Object.entries(rest)) if (v !== undefined) Object.assign(out, { [k]: v });
  return out;
}

const reps = { type: 'reps' } as const;
const hold = { type: 'duration' } as const;
/** Assisted machines: the weight entered is the assistance. */
const assisted = { type: 'reps', assisted: true } as const;
const cardio = { type: 'distance_duration' } as const;
const pace = { ...cardio, metric: 'pace' } as const;
const speed = { ...cardio, metric: 'speed' } as const;
/** Timed cardio and sports, logged as time and calories. */
const session = { type: 'duration' } as const;

/**
 * Built-in exercise library. `standard` is an approximate intermediate-level
 * 1RM as a multiple of bodyweight for a male lifter; it is what lets very
 * different lifts feed into one strength score.
 */
export const BUILT_IN_EXERCISES: Exercise[] = [
  // Chest
  ex('bench-press', 'Bench Press', 'chest', ['triceps', 'shoulders'], 'barbell', { standard: 1.15 }),
  ex('incline-bench-press', 'Incline Bench Press', 'chest', ['shoulders', 'triceps'], 'barbell', { standard: 0.95 }),
  ex('decline-bench-press', 'Decline Bench Press', 'chest', ['triceps'], 'barbell', { standard: 1.1 }),
  ex('db-bench-press', 'Dumbbell Bench Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', { standard: 0.42 }),
  ex('incline-db-press', 'Incline Dumbbell Press', 'chest', ['shoulders', 'triceps'], 'dumbbell', { standard: 0.36 }),
  ex('chest-press-machine', 'Chest Press', 'chest', ['triceps'], 'machine', { standard: 1.0 }),
  ex('cable-fly', 'Cable Fly', 'chest', [], 'cable'),
  ex('db-fly', 'Dumbbell Fly', 'chest', [], 'dumbbell'),
  ex('pec-deck', 'Pec Deck', 'chest', [], 'machine'),
  ex('incline-chest-press-machine', 'Incline Chest Press Machine', 'chest', ['shoulders', 'triceps'], 'machine'),
  ex('decline-chest-press-machine', 'Decline Chest Press Machine', 'chest', ['triceps'], 'machine'),
  ex('smith-bench-press', 'Smith Machine Bench Press', 'chest', ['triceps', 'shoulders'], 'machine'),
  ex('smith-incline-press', 'Smith Machine Incline Press', 'chest', ['shoulders', 'triceps'], 'machine'),
  ex('low-cable-fly', 'Low-to-High Cable Fly', 'chest', ['shoulders'], 'cable'),
  ex('assisted-dip', 'Assisted Dip', 'chest', ['triceps', 'shoulders'], 'machine', assisted),
  ex('push-up', 'Push-Up', 'chest', ['triceps', 'shoulders'], 'bodyweight', reps),
  ex('dip', 'Dip', 'chest', ['triceps', 'shoulders'], 'bodyweight', { ...reps, standard: 1.45 }),

  // Back
  ex('deadlift', 'Deadlift', 'back', ['hamstrings', 'glutes', 'traps', 'forearms'], 'barbell', { standard: 1.8 }),
  ex('barbell-row', 'Barbell Row', 'back', ['lats', 'biceps'], 'barbell', { standard: 0.95 }),
  ex('db-row', 'Dumbbell Row', 'back', ['lats', 'biceps'], 'dumbbell', { standard: 0.42 }),
  ex('t-bar-row', 'T-Bar Row', 'back', ['lats', 'biceps'], 'barbell', { standard: 1.0 }),
  ex('seated-cable-row', 'Seated Cable Row', 'back', ['lats', 'biceps'], 'cable', { standard: 1.0 }),
  ex('machine-row', 'Machine Row', 'back', ['lats', 'biceps'], 'machine'),
  ex('chest-supported-row', 'Chest-Supported Row', 'back', ['lats', 'biceps'], 'machine'),
  ex('high-row-machine', 'High Row Machine', 'lats', ['back', 'biceps'], 'machine'),
  ex('low-row-machine', 'Low Row Machine', 'back', ['lats', 'biceps'], 'machine'),
  ex('machine-lat-pulldown', 'Machine Lat Pulldown', 'lats', ['biceps'], 'machine'),
  ex('close-grip-pulldown', 'Close-Grip Lat Pulldown', 'lats', ['biceps'], 'cable'),
  ex('pullover-machine', 'Pullover Machine', 'lats', ['chest'], 'machine'),
  ex('assisted-pull-up', 'Assisted Pull-Up', 'lats', ['biceps', 'back'], 'machine', assisted),
  ex('assisted-chin-up', 'Assisted Chin-Up', 'lats', ['biceps'], 'machine', assisted),
  ex('back-extension-machine', 'Back Extension Machine', 'back', ['glutes'], 'machine'),
  ex('pull-up', 'Pull-Up', 'lats', ['biceps', 'back'], 'bodyweight', { ...reps, standard: 1.3 }),
  ex('chin-up', 'Chin-Up', 'lats', ['biceps'], 'bodyweight', { ...reps, standard: 1.35 }),
  ex('lat-pulldown', 'Lat Pulldown', 'lats', ['biceps'], 'cable', { standard: 0.95 }),
  ex('straight-arm-pulldown', 'Straight-Arm Pulldown', 'lats', [], 'cable'),
  ex('inverted-row', 'Inverted Row', 'back', ['biceps'], 'bodyweight', reps),
  ex('shrug', 'Barbell Shrug', 'traps', ['forearms'], 'barbell', { standard: 1.5 }),
  ex('db-shrug', 'Dumbbell Shrug', 'traps', ['forearms'], 'dumbbell'),
  ex('back-extension', 'Back Extension', 'back', ['glutes', 'hamstrings'], 'bodyweight', reps),

  // Shoulders
  ex('overhead-press', 'Overhead Press', 'shoulders', ['triceps'], 'barbell', { standard: 0.72 }),
  ex('push-press', 'Push Press', 'shoulders', ['triceps', 'quads'], 'barbell', { standard: 0.9 }),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', ['triceps'], 'dumbbell', { standard: 0.3 }),
  ex('machine-shoulder-press', 'Machine Shoulder Press', 'shoulders', ['triceps'], 'machine', { standard: 0.7 }),
  ex('smith-shoulder-press', 'Smith Machine Shoulder Press', 'shoulders', ['triceps'], 'machine'),
  ex('lateral-raise-machine', 'Lateral Raise Machine', 'shoulders', [], 'machine'),
  ex('arnold-press', 'Arnold Press', 'shoulders', ['triceps'], 'dumbbell', { standard: 0.27 }),
  ex('lateral-raise', 'Lateral Raise', 'shoulders', [], 'dumbbell', { standard: 0.14 }),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', [], 'cable'),
  ex('front-raise', 'Front Raise', 'shoulders', [], 'dumbbell'),
  ex('rear-delt-fly', 'Rear Delt Fly', 'shoulders', ['back'], 'dumbbell'),
  ex('reverse-pec-deck', 'Reverse Pec Deck', 'shoulders', ['back'], 'machine'),
  ex('face-pull', 'Face Pull', 'shoulders', ['back', 'traps'], 'cable'),
  ex('upright-row', 'Upright Row', 'shoulders', ['traps'], 'barbell'),

  // Arms
  ex('barbell-curl', 'Barbell Curl', 'biceps', ['forearms'], 'barbell', { standard: 0.55 }),
  ex('db-curl', 'Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell', { standard: 0.25 }),
  ex('hammer-curl', 'Hammer Curl', 'biceps', ['forearms'], 'dumbbell', { standard: 0.27 }),
  ex('preacher-curl', 'Preacher Curl', 'biceps', [], 'barbell', { standard: 0.45 }),
  ex('incline-db-curl', 'Incline Dumbbell Curl', 'biceps', [], 'dumbbell'),
  ex('cable-curl', 'Cable Curl', 'biceps', ['forearms'], 'cable'),
  ex('tricep-pushdown', 'Triceps Pushdown', 'triceps', [], 'cable', { standard: 0.55 }),
  ex('overhead-tricep-extension', 'Overhead Triceps Extension', 'triceps', [], 'cable'),
  ex('skull-crusher', 'Skull Crusher', 'triceps', [], 'barbell', { standard: 0.45 }),
  ex('close-grip-bench', 'Close-Grip Bench Press', 'triceps', ['chest', 'shoulders'], 'barbell', { standard: 1.0 }),
  ex('db-kickback', 'Triceps Kickback', 'triceps', [], 'dumbbell'),
  ex('wrist-curl', 'Wrist Curl', 'forearms', [], 'dumbbell'),
  ex('bicep-curl-machine', 'Biceps Curl Machine', 'biceps', [], 'machine'),
  ex('machine-preacher-curl', 'Machine Preacher Curl', 'biceps', [], 'machine'),
  ex('tricep-extension-machine', 'Triceps Extension Machine', 'triceps', [], 'machine'),
  ex('seated-dip-machine', 'Seated Dip Machine', 'triceps', ['chest'], 'machine'),

  // Legs
  ex('squat', 'Squat', 'quads', ['glutes', 'hamstrings'], 'barbell', { standard: 1.5 }),
  ex('front-squat', 'Front Squat', 'quads', ['glutes', 'abs'], 'barbell', { standard: 1.2 }),
  ex('leg-press', 'Leg Press', 'quads', ['glutes', 'hamstrings'], 'machine', { standard: 2.6 }),
  ex('hack-squat', 'Hack Squat', 'quads', ['glutes'], 'machine', { standard: 1.6 }),
  ex('goblet-squat', 'Goblet Squat', 'quads', ['glutes'], 'dumbbell', { standard: 0.6 }),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', ['glutes', 'hamstrings'], 'dumbbell', { standard: 0.35 }),
  ex('lunge', 'Dumbbell Lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', { standard: 0.35 }),
  ex('step-up', 'Step-Up', 'quads', ['glutes'], 'dumbbell'),
  ex('leg-extension', 'Leg Extension', 'quads', [], 'machine', { standard: 1.0 }),
  ex('smith-squat', 'Smith Machine Squat', 'quads', ['glutes', 'hamstrings'], 'machine'),
  ex('pendulum-squat', 'Pendulum Squat', 'quads', ['glutes'], 'machine'),
  ex('belt-squat', 'Belt Squat', 'quads', ['glutes'], 'machine'),
  ex('romanian-deadlift', 'Romanian Deadlift', 'hamstrings', ['glutes', 'back'], 'barbell', { standard: 1.4 }),
  ex('db-romanian-deadlift', 'Dumbbell Romanian Deadlift', 'hamstrings', ['glutes'], 'dumbbell', { standard: 0.55 }),
  ex('sumo-deadlift', 'Sumo Deadlift', 'glutes', ['quads', 'hamstrings', 'back'], 'barbell', { standard: 1.8 }),
  ex('lying-leg-curl', 'Lying Leg Curl', 'hamstrings', [], 'machine', { standard: 0.7 }),
  ex('seated-leg-curl', 'Seated Leg Curl', 'hamstrings', [], 'machine', { standard: 0.8 }),
  ex('standing-leg-curl', 'Standing Leg Curl', 'hamstrings', [], 'machine'),
  ex('hip-thrust', 'Hip Thrust', 'glutes', ['hamstrings'], 'barbell', { standard: 1.8 }),
  ex('glute-bridge', 'Glute Bridge', 'glutes', ['hamstrings'], 'bodyweight', reps),
  ex('hip-thrust-machine', 'Hip Thrust Machine', 'glutes', ['hamstrings'], 'machine'),
  ex('glute-kickback-machine', 'Glute Kickback Machine', 'glutes', ['hamstrings'], 'machine'),
  ex('hip-abduction', 'Hip Abduction', 'glutes', [], 'machine'),
  ex('hip-adduction', 'Hip Adduction', 'quads', [], 'machine'),
  ex('standing-calf-raise', 'Standing Calf Raise', 'calves', [], 'machine', { standard: 1.5 }),
  ex('seated-calf-raise', 'Seated Calf Raise', 'calves', [], 'machine'),
  ex('leg-press-calf-raise', 'Leg Press Calf Raise', 'calves', [], 'machine'),

  // Full body / power
  ex('power-clean', 'Power Clean', 'glutes', ['quads', 'traps', 'shoulders'], 'barbell', { standard: 1.0 }),
  ex('kettlebell-swing', 'Kettlebell Swing', 'glutes', ['hamstrings', 'back'], 'kettlebell'),
  ex('burpee', 'Burpee', 'cardio', ['chest', 'quads'], 'bodyweight', reps),

  // Core
  ex('plank', 'Plank', 'abs', [], 'bodyweight', hold),
  ex('side-plank', 'Side Plank', 'abs', [], 'bodyweight', hold),
  ex('crunch', 'Crunch', 'abs', [], 'bodyweight', reps),
  ex('cable-crunch', 'Cable Crunch', 'abs', [], 'cable'),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'abs', ['forearms'], 'bodyweight', reps),
  ex('ab-wheel', 'Ab Wheel Rollout', 'abs', ['lats'], 'other', reps),
  ex('russian-twist', 'Russian Twist', 'abs', [], 'bodyweight', reps),
  ex('dead-bug', 'Dead Bug', 'abs', [], 'bodyweight', reps),
  ex('ab-crunch-machine', 'Ab Crunch Machine', 'abs', [], 'machine'),
  ex('torso-rotation', 'Torso Rotation Machine', 'abs', [], 'machine'),
  ex('captains-chair', "Captain's Chair Leg Raise", 'abs', [], 'machine', reps),

  // Cardio
  // Runs and walks (pace per mile/km)
  ex('running', 'Running', 'cardio', ['quads', 'calves'], 'other', pace),
  ex('jogging', 'Jogging', 'cardio', ['quads', 'calves'], 'other', pace),
  ex('treadmill', 'Treadmill Run', 'cardio', ['quads', 'calves'], 'machine', pace),
  ex('trail-running', 'Trail Running', 'cardio', ['quads', 'calves', 'glutes'], 'other', pace),
  ex('sprints', 'Sprints', 'cardio', ['quads', 'hamstrings', 'glutes'], 'other', { ...speed, distanceScale: 'metres' }),
  ex('walking', 'Walking', 'cardio', [], 'other', pace),
  ex('treadmill-walk', 'Treadmill Walk', 'cardio', [], 'machine', pace),
  ex('incline-walk', 'Incline Treadmill Walk', 'cardio', ['glutes', 'calves'], 'machine', pace),
  ex('hiking', 'Hiking', 'cardio', ['quads', 'glutes', 'calves'], 'other', pace),
  ex('rucking', 'Rucking', 'cardio', ['quads', 'glutes', 'traps'], 'other', pace),

  // Bikes (speed)
  ex('cycling', 'Cycling', 'cardio', ['quads'], 'other', speed),
  ex('stationary-bike', 'Stationary Bike', 'cardio', ['quads'], 'machine', speed),
  ex('mountain-biking', 'Mountain Biking', 'cardio', ['quads', 'glutes'], 'other', speed),
  ex('spin-class', 'Spin Class', 'cardio', ['quads'], 'machine', session),
  ex('air-bike', 'Air Bike', 'cardio', ['quads', 'shoulders'], 'machine', session),

  // Water, ergs and machines
  ex('rowing-machine', 'Rowing Machine', 'cardio', ['back', 'quads'], 'machine', { ...cardio, metric: 'split500', distanceScale: 'metres' }),
  ex('ski-erg', 'Ski Erg', 'cardio', ['lats', 'triceps', 'abs'], 'machine', { ...cardio, metric: 'split500', distanceScale: 'metres' }),
  ex('swimming', 'Swimming', 'cardio', ['back', 'shoulders'], 'other', { ...cardio, metric: 'split100', distanceScale: 'pool' }),
  ex('kayaking', 'Kayaking', 'cardio', ['back', 'shoulders'], 'other', speed),
  ex('elliptical', 'Elliptical', 'cardio', [], 'machine', speed),
  ex('stair-climber', 'Stair Climber', 'cardio', ['glutes', 'quads'], 'machine', session),

  // Conditioning and sports (time + calories)
  ex('jump-rope', 'Jump Rope', 'cardio', ['calves'], 'other', session),
  ex('hiit', 'HIIT', 'cardio', ['quads'], 'other', session),
  ex('battle-ropes', 'Battle Ropes', 'cardio', ['shoulders', 'abs'], 'other', session),
  ex('boxing', 'Boxing', 'cardio', ['shoulders', 'abs'], 'other', session),
  ex('dance', 'Dance', 'cardio', [], 'other', session),
  ex('basketball', 'Basketball', 'cardio', ['quads', 'calves'], 'other', session),
  ex('soccer', 'Soccer', 'cardio', ['quads', 'hamstrings'], 'other', session),
  ex('tennis', 'Tennis', 'cardio', ['shoulders'], 'other', session),
  ex('pickleball', 'Pickleball', 'cardio', [], 'other', session),
];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  lats: 'Lats',
  traps: 'Traps',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
};

/** Filter chips shown in the exercise picker and library. */
export const MUSCLE_FILTERS: { id: string; label: string; muscles: Muscle[] }[] = [
  { id: 'chest', label: 'Chest', muscles: ['chest'] },
  { id: 'back', label: 'Back', muscles: ['back', 'lats', 'traps'] },
  { id: 'shoulders', label: 'Shoulders', muscles: ['shoulders'] },
  { id: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'legs', label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'core', label: 'Core', muscles: ['abs'] },
  { id: 'cardio', label: 'Cardio', muscles: ['cardio'] },
];

const MUSCLE_CLASS: Record<Muscle, string> = {
  chest: 'm-chest',
  back: 'm-back',
  lats: 'm-back',
  traps: 'm-back',
  shoulders: 'm-shoulders',
  biceps: 'm-arms',
  triceps: 'm-arms',
  forearms: 'm-arms',
  quads: 'm-legs',
  hamstrings: 'm-legs',
  glutes: 'm-legs',
  calves: 'm-legs',
  abs: 'm-core',
  cardio: 'm-cardio',
};

/** CSS class carrying the muscle group's identity colour (see styles.css). */
export function muscleClass(muscle: Muscle | undefined): string {
  return muscle ? MUSCLE_CLASS[muscle] : '';
}
