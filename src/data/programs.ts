export interface ProgramDay {
  name: string;
  exercises: { exerciseId: string; sets: number; reps?: number; restSec?: number }[];
}

export interface Program {
  id: string;
  name: string;
  description: string;
  daysPerWeek: string;
  days: ProgramDay[];
}

const e = (exerciseId: string, sets: number, reps?: number, restSec?: number) => ({ exerciseId, sets, reps, restSec });

/** Ready-made plans the user can copy into their own routines. */
export const PROGRAMS: Program[] = [
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Two alternating full-body sessions. Great for beginners or busy weeks.',
    daysPerWeek: '2–3 days',
    days: [
      {
        name: 'Full Body A',
        exercises: [
          e('squat', 3, 8, 150),
          e('bench-press', 3, 8, 150),
          e('barbell-row', 3, 10, 120),
          e('lateral-raise', 3, 12, 60),
          e('plank', 3),
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          e('romanian-deadlift', 3, 10, 150),
          e('overhead-press', 3, 8, 120),
          e('lat-pulldown', 3, 10, 90),
          e('db-curl', 3, 12, 60),
          e('tricep-pushdown', 3, 12, 60),
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: 'Split the body in half and train each twice a week.',
    daysPerWeek: '4 days',
    days: [
      {
        name: 'Upper',
        exercises: [
          e('bench-press', 4, 6, 150),
          e('barbell-row', 4, 8, 120),
          e('db-shoulder-press', 3, 10, 90),
          e('lat-pulldown', 3, 10, 90),
          e('db-curl', 3, 12, 60),
          e('tricep-pushdown', 3, 12, 60),
        ],
      },
      {
        name: 'Lower',
        exercises: [
          e('squat', 4, 6, 180),
          e('romanian-deadlift', 3, 8, 150),
          e('leg-press', 3, 12, 120),
          e('lying-leg-curl', 3, 12, 60),
          e('standing-calf-raise', 4, 12, 60),
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'The classic bodybuilding split. Run it once or twice a week.',
    daysPerWeek: '3–6 days',
    days: [
      {
        name: 'Push',
        exercises: [
          e('bench-press', 4, 8, 150),
          e('overhead-press', 3, 8, 120),
          e('incline-db-press', 3, 10, 90),
          e('lateral-raise', 3, 15, 60),
          e('tricep-pushdown', 3, 12, 60),
        ],
      },
      {
        name: 'Pull',
        exercises: [
          e('deadlift', 3, 5, 180),
          e('pull-up', 3, 8, 120),
          e('seated-cable-row', 3, 10, 90),
          e('face-pull', 3, 15, 60),
          e('hammer-curl', 3, 12, 60),
        ],
      },
      {
        name: 'Legs',
        exercises: [
          e('squat', 4, 8, 180),
          e('romanian-deadlift', 3, 10, 150),
          e('leg-extension', 3, 12, 60),
          e('seated-leg-curl', 3, 12, 60),
          e('standing-calf-raise', 4, 15, 60),
        ],
      },
    ],
  },
  {
    id: 'strength-5x5',
    name: 'Strength 5×5',
    description: 'Heavy compound lifts, five sets of five. Add weight every session.',
    daysPerWeek: '3 days',
    days: [
      {
        name: '5×5 Workout A',
        exercises: [e('squat', 5, 5, 180), e('bench-press', 5, 5, 180), e('barbell-row', 5, 5, 180)],
      },
      {
        name: '5×5 Workout B',
        exercises: [e('squat', 5, 5, 180), e('overhead-press', 5, 5, 180), e('deadlift', 1, 5, 180)],
      },
    ],
  },
];
