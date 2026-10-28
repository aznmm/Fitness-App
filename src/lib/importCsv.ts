import { uid } from './id';
import { toKg } from './units';
import type { Equipment, Exercise, ExerciseType, Muscle, SetKind, Unit, Workout, WorkoutSet } from '../types';

// ---------------------------------------------------------------------------
// CSV parsing

export interface CsvTable {
  header: string[];
  rows: string[][];
}

/** RFC 4180-ish parser: quoted fields, escaped quotes, CRLF, and , ; or tab delimiters. */
export function parseCsv(text: string): CsvTable {
  const clean = text.replace(/^﻿/, '');
  const nl = clean.search(/\r?\n/);
  const firstLine = nl === -1 ? clean : clean.slice(0, nl);
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  const [header = [], ...body] = rows;
  return { header: header.map((h) => h.trim()), rows: body };
}

// ---------------------------------------------------------------------------
// Column detection

export type Field =
  | 'date'
  | 'endTime'
  | 'workoutName'
  | 'workoutDuration'
  | 'exercise'
  | 'setOrder'
  | 'setType'
  | 'weight'
  | 'reps'
  | 'distance'
  | 'seconds'
  | 'notes'
  | 'workoutNotes';

export type ColumnMap = Partial<Record<Field, number>>;

export const FIELD_LABELS: Record<Field, string> = {
  date: 'Date / start time',
  endTime: 'End time',
  workoutName: 'Workout name',
  workoutDuration: 'Workout duration',
  exercise: 'Exercise',
  setOrder: 'Set number',
  setType: 'Set type',
  weight: 'Weight',
  reps: 'Reps',
  distance: 'Distance',
  seconds: 'Set time',
  notes: 'Exercise notes',
  workoutNotes: 'Workout notes',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const SYNONYMS: Record<Field, string[]> = {
  date: ['date', 'starttime', 'start', 'workoutdate', 'datetime', 'day', 'startdate', 'performedat', 'timestamp'],
  endTime: ['endtime', 'end', 'enddate', 'finishedat'],
  workoutName: ['workoutname', 'title', 'workout', 'name', 'session', 'routine', 'routinename', 'workouttitle'],
  workoutDuration: ['workoutduration', 'durationmin', 'durationminutes'],
  exercise: ['exercisename', 'exercise', 'exercisetitle', 'movement', 'lift', 'exercisetype'],
  setOrder: ['setorder', 'set', 'setindex', 'setnumber', 'setno', 'setnum'],
  setType: ['settype', 'type', 'kind'],
  weight: ['weight', 'weightlbs', 'weightlb', 'weightkg', 'load', 'weightkgs'],
  reps: ['reps', 'repetitions', 'rep', 'repcount'],
  distance: ['distance', 'distancekm', 'distancemiles', 'distancemi', 'distancem', 'distancemeters'],
  seconds: ['seconds', 'durationseconds', 'durationsec', 'time', 'secs', 'setduration'],
  notes: ['notes', 'exercisenotes', 'note', 'setnotes'],
  workoutNotes: ['workoutnotes', 'description', 'workoutdescription'],
};

export type DetectedFormat = 'strong' | 'hevy' | 'generic';

export interface Detection {
  format: DetectedFormat;
  columns: ColumnMap;
  /** Unit stated in the header (e.g. "weight_kg"); undefined if the file doesn't say. */
  weightUnit?: Unit;
  distanceUnit?: DistanceUnit;
}

export type DistanceUnit = 'km' | 'mi' | 'm';

export function detectColumns(header: string[]): Detection {
  const keys = header.map(norm);
  const columns: ColumnMap = {};
  for (const field of Object.keys(SYNONYMS) as Field[]) {
    for (const syn of SYNONYMS[field]) {
      const i = keys.indexOf(syn);
      if (i >= 0 && !Object.values(columns).includes(i)) {
        columns[field] = i;
        break;
      }
    }
  }
  // Strong: "Duration" is the whole workout, "Seconds" is per set.
  const dur = keys.indexOf('duration');
  if (dur >= 0 && !Object.values(columns).includes(dur)) {
    if (columns.seconds !== undefined) columns.workoutDuration = dur;
    else columns.seconds = dur;
  }

  const wHeader = columns.weight !== undefined ? keys[columns.weight] : '';
  const dHeader = columns.distance !== undefined ? keys[columns.distance] : '';
  const weightUnit: Unit | undefined = /lb/.test(wHeader) ? 'lb' : /kg/.test(wHeader) ? 'kg' : undefined;
  const distanceUnit: DistanceUnit | undefined = /mi/.test(dHeader) ? 'mi' : /km/.test(dHeader) ? 'km' : /meter|m$/.test(dHeader) && dHeader !== 'distance' ? 'm' : undefined;

  const format: DetectedFormat =
    keys.includes('exercisetitle') && keys.includes('starttime') ? 'hevy'
    : keys.includes('workoutname') && keys.includes('exercisename') && keys.includes('setorder') ? 'strong'
    : 'generic';
  return { format, columns, weightUnit, distanceUnit };
}

export function missingRequired(columns: ColumnMap): Field[] {
  const need: Field[] = ['date', 'exercise'];
  const missing = need.filter((f) => columns[f] === undefined);
  if (columns.reps === undefined && columns.seconds === undefined && columns.distance === undefined) missing.push('reps');
  return missing;
}

// ---------------------------------------------------------------------------
// Dates & numbers (no Date.parse: Safari rejects most non-ISO formats)

export type DateOrder = 'mdy' | 'dmy';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function to24h(h: number, ampm?: string): number {
  if (!ampm) return h;
  const pm = ampm.toLowerCase() === 'pm';
  return (h % 12) + (pm ? 12 : 0);
}

export function parseDate(input: string, order: DateOrder = 'mdy'): number | undefined {
  const s = input.trim();
  if (!s) return undefined;
  if (/^\d{10}(\.\d+)?$/.test(s)) return Number(s) * 1000;
  if (/^\d{13}$/.test(s)) return Number(s);

  const time = (h?: string, m?: string, sec?: string, ampm?: string) => [h ? to24h(Number(h), ampm) : 12, m ? Number(m) : 0, sec ? Number(sec) : 0] as const;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?/);
  if (m) {
    if (m[7]) {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
      if (m[7] === 'Z') return t;
      const sign = m[7][0] === '-' ? -1 : 1;
      const [oh, om] = [Number(m[7].slice(1, 3)), Number(m[7].slice(-2))];
      return t - sign * (oh * 60 + om) * 60000;
    }
    const [h, mi, se] = time(m[4], m[5], m[6]);
    return new Date(+m[1], +m[2] - 1, +m[3], h, mi, se).getTime();
  }

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    const [month, day] = order === 'dmy' ? [b, a] : [a, b];
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const [h, mi, se] = time(m[4], m[5], m[6], m[7]);
    return new Date(year, month - 1, day, h, mi, se).getTime();
  }

  // "1 Oct 2023, 18:30" (Hevy) or "Oct 1, 2023 6:30 PM"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})(?:,?\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  const m2 = m ? null : s.match(/^(?:[A-Za-z]+,?\s+)?([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})(?:,?\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  const named = m ? { day: m[1], mon: m[2], rest: m.slice(3) } : m2 ? { day: m2[2], mon: m2[1], rest: m2.slice(3) } : null;
  if (named) {
    const month = MONTHS.indexOf(named.mon.slice(0, 3).toLowerCase());
    if (month < 0) return undefined;
    const [year, hh, mm, ss, ampm] = named.rest;
    const [h, mi, se] = time(hh, mm, ss, ampm);
    return new Date(+year, month, +named.day, h, mi, se).getTime();
  }
  return undefined;
}

/** True when some slash date has a first part > 12, i.e. the file is day-first. */
export function guessDateOrder(values: string[]): DateOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/);
    if (m && +m[1] > 12) return 'dmy';
  }
  return 'mdy';
}

export function parseNumber(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const s = v.trim().replace(/\s/g, '');
  if (!s) return undefined;
  // "1.234,5" or "62,5" → European decimal comma
  const normalized = /,\d{1,2}$/.test(s) && !/\.\d+,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(normalized.replace(/[^0-9.eE+-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** "1h 5m", "45m", "1:05:00", "3900" → seconds. Bare numbers ≤ 300 are read as minutes. */
export function parseWorkoutDuration(v: string | undefined, header = ''): number | undefined {
  if (!v?.trim()) return undefined;
  const s = v.trim().toLowerCase();
  if (/^\d+:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map(Number);
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  }
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = s.match(/(\d+(?:\.\d+)?)\s*m(?!s)/);
  const sec = s.match(/(\d+(?:\.\d+)?)\s*s/);
  if (h || m || sec) return (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0) + (sec ? +sec[1] : 0);
  const n = parseNumber(s);
  if (n === undefined) return undefined;
  if (/min/.test(header)) return n * 60;
  if (/sec/.test(header)) return n;
  return n <= 300 ? n * 60 : n;
}

// ---------------------------------------------------------------------------
// Building workouts

export interface ImportOptions {
  weightUnit: Unit;
  distanceUnit: DistanceUnit;
  dateOrder: DateOrder;
}

export interface ParsedExercise {
  name: string;
  sets: Omit<WorkoutSet, 'id' | 'done'>[];
  notes?: string;
}

export interface ParsedWorkout {
  name: string;
  startedAt: number;
  endedAt: number;
  notes?: string;
  exercises: ParsedExercise[];
}

export interface BuildResult {
  workouts: ParsedWorkout[];
  skippedRows: number;
  badDates: number;
}

function setKind(type: string | undefined, order: string | undefined): SetKind {
  const t = (type || order || '').trim().toLowerCase();
  if (/^w(arm)?/.test(t)) return 'warmup';
  if (/^d(rop)?/.test(t)) return 'drop';
  if (/^f(ail)?/.test(t)) return 'failure';
  return 'normal';
}

const DIST_TO_M: Record<DistanceUnit, number> = { km: 1000, mi: 1609.344, m: 1 };

export function buildWorkouts(table: CsvTable, columns: ColumnMap, opts: ImportOptions): BuildResult {
  const get = (row: string[], f: Field) => (columns[f] !== undefined ? row[columns[f]!]?.trim() : undefined);
  const durationHeader = columns.workoutDuration !== undefined ? norm(table.header[columns.workoutDuration]) : '';
  const byKey = new Map<string, ParsedWorkout & { order: Map<string, ParsedExercise>; setOrders: Map<ParsedExercise, number[]> }>();
  let skippedRows = 0;
  let badDates = 0;

  for (const row of table.rows) {
    const exerciseName = get(row, 'exercise');
    const startedAt = parseDate(get(row, 'date') ?? '', opts.dateOrder);
    if (!exerciseName) {
      skippedRows++;
      continue;
    }
    if (startedAt === undefined) {
      badDates++;
      continue;
    }
    const weight = parseNumber(get(row, 'weight'));
    const reps = parseNumber(get(row, 'reps'));
    const distance = parseNumber(get(row, 'distance'));
    const seconds = parseNumber(get(row, 'seconds'));
    if (!weight && !reps && !distance && !seconds) {
      skippedRows++; // rest-timer rows, notes-only rows, empty sets
      continue;
    }

    const name = get(row, 'workoutName') || 'Imported workout';
    const minute = Math.floor(startedAt / 60000);
    const key = `${minute}|${name}`;
    let w = byKey.get(key);
    if (!w) {
      const end = parseDate(get(row, 'endTime') ?? '', opts.dateOrder);
      const dur = parseWorkoutDuration(get(row, 'workoutDuration'), durationHeader);
      w = {
        name,
        startedAt,
        endedAt: end && end > startedAt ? end : dur ? startedAt + dur * 1000 : 0,
        notes: get(row, 'workoutNotes') || undefined,
        exercises: [],
        order: new Map(),
        setOrders: new Map(),
      };
      byKey.set(key, w);
    }
    let ex = w.order.get(exerciseName);
    if (!ex) {
      ex = { name: exerciseName, sets: [] };
      w.order.set(exerciseName, ex);
      w.exercises.push(ex);
      w.setOrders.set(ex, []);
    }
    const note = get(row, 'notes');
    if (note && !ex.notes) ex.notes = note;
    const orderRaw = get(row, 'setOrder');
    ex.sets.push({
      kind: setKind(get(row, 'setType'), orderRaw && /^[a-z]/i.test(orderRaw) ? orderRaw : undefined),
      weight: weight ? toKg(weight, opts.weightUnit) : undefined,
      reps: reps ? Math.round(reps) : undefined,
      distance: distance ? distance * DIST_TO_M[opts.distanceUnit] : undefined,
      duration: seconds ? Math.round(seconds) : undefined,
    });
    w.setOrders.get(ex)!.push(parseNumber(orderRaw) ?? ex.sets.length);
  }

  const workouts = [...byKey.values()]
    .map(({ order: _o, setOrders, ...w }) => {
      for (const ex of w.exercises) {
        const orders = setOrders.get(ex)!;
        const idx = ex.sets.map((_, i) => i).sort((a, b) => orders[a] - orders[b]);
        ex.sets = idx.map((i) => ex.sets[i]);
      }
      if (!w.endedAt) {
        // No end time in the file: assume ~3 minutes per set, at least 20 minutes.
        const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
        w.endedAt = w.startedAt + Math.max(20, sets * 3) * 60000;
      }
      return w;
    })
    .sort((a, b) => a.startedAt - b.startedAt);
  return { workouts, skippedRows, badDates };
}

// ---------------------------------------------------------------------------
// Exercise matching

const TOKEN_SYNONYMS: Record<string, string[]> = {
  pullup: ['pull', 'up'],
  pullups: ['pull', 'up'],
  chinup: ['chin', 'up'],
  chinups: ['chin', 'up'],
  pushup: ['push', 'up'],
  pushups: ['push', 'up'],
  situp: ['sit', 'up'],
  stepup: ['step', 'up'],
  pulldown: ['pulldown'],
  tricep: ['triceps'],
  bicep: [],
  biceps: [],
  bb: ['barbell'],
  db: ['dumbbell'],
  dumbell: ['dumbbell'],
  kb: ['kettlebell'],
  ez: ['barbell'],
  ezbar: ['barbell'],
  smith: ['machine'],
  rdl: ['romanian', 'deadlift'],
  ohp: ['overhead', 'press'],
  military: ['overhead'],
  flye: ['fly'],
  flyes: ['fly'],
  flies: ['fly'],
  raises: ['raise'],
  curls: ['curl'],
  rows: ['row'],
  extensions: ['extension'],
  presses: ['press'],
  squats: ['squat'],
  lunges: ['lunge'],
  dips: ['dip'],
  crunches: ['crunch'],
  shrugs: ['shrug'],
  thrusts: ['thrust'],
  narrow: ['close'],
  hyperextension: ['back', 'extension'],
  hyperextensions: ['back', 'extension'],
  hyper: ['back'],
  underhand: ['reverse'],
  supinated: ['reverse'],
  bodyweight: [],
  weighted: [],
  standing: [],
  exercise: [],
};

const EQUIPMENT_TOKEN: Partial<Record<Equipment, string>> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  kettlebell: 'kettlebell',
  band: 'band',
};

export function nameTokens(name: string): Set<string> {
  const out = new Set<string>();
  for (const raw of name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    const mapped = TOKEN_SYNONYMS[raw] ?? [raw];
    for (const t of mapped) out.add(t);
  }
  return out;
}

const EQUIPMENT_WORDS = new Set(Object.values(EQUIPMENT_TOKEN));

/** Words that change which exercise it is; they count double when comparing names. */
const MODIFIERS = new Set([
  'incline', 'decline', 'close', 'front', 'reverse', 'rear', 'seated', 'lying', 'romanian', 'sumo', 'hack',
  'goblet', 'bulgarian', 'overhead', 'hammer', 'preacher', 'lateral', 'upright', 'straight', 'inverted', 'hanging',
  'side', 'push', 'chin', 'arnold', 'face', 'calf', 'hip', 'leg', 'kickback', 'skull',
  'wide', 'neutral', 'smith', 'ez', 'diamond', 'rope', 'single', 'walking', 'pendlay', 'landmine', 'nordic', 'stance',
]);

/** Weighted Jaccard similarity between two token sets. */
function similarity(a: Set<string>, b: Set<string>): number {
  const w = (t: string) => (MODIFIERS.has(t) ? 2 : 1);
  let inter = 0;
  let union = 0;
  for (const t of new Set([...a, ...b])) {
    union += w(t);
    if (a.has(t) && b.has(t)) inter += w(t);
  }
  return union ? inter / union : 0;
}

function libraryTokens(e: Exercise): Set<string> {
  const t = nameTokens(e.name);
  const eq = EQUIPMENT_TOKEN[e.equipment];
  if (eq) t.add(eq);
  return t;
}

export type MatchConfidence = 'exact' | 'fuzzy' | 'none';

export interface Match {
  exercise?: Exercise;
  confidence: MatchConfidence;
}

/** Match an imported name like "Bench Press (Barbell)" to a library exercise. */
export function matchExercise(name: string, library: Exercise[]): Match {
  const lower = name.trim().toLowerCase();
  const byName = library.find((e) => e.name.toLowerCase() === lower);
  if (byName) return { exercise: byName, confidence: 'exact' };

  const tokens = nameTokens(name);
  const importEquipment = [...tokens].filter((t) => EQUIPMENT_WORDS.has(t));
  let best: { e: Exercise; score: number } | undefined;
  for (const e of library) {
    const lt = libraryTokens(e);
    if (![...tokens].some((t) => lt.has(t))) continue;
    // Also compare against the bare library name, so "Pulldown" can still find "Lat Pulldown".
    let score = Math.max(similarity(tokens, lt), similarity(tokens, nameTokens(e.name)));
    // The import names equipment this exercise doesn't use: prefer one that does.
    const eq = EQUIPMENT_TOKEN[e.equipment];
    if (importEquipment.length && (!eq || !importEquipment.includes(eq))) score *= 0.7;
    if (!best || score > best.score) best = { e, score };
  }
  if (best && best.score === 1) return { exercise: best.e, confidence: 'exact' };
  if (best && best.score >= 0.5) return { exercise: best.e, confidence: 'fuzzy' };
  return { confidence: 'none' };
}

/** Guess how an unmatched exercise should be logged from its sets. */
export function guessType(sets: ParsedExercise['sets']): ExerciseType {
  if (sets.some((s) => s.distance)) return 'distance_duration';
  if (sets.some((s) => s.weight)) return 'weight_reps';
  if (sets.some((s) => s.reps)) return 'reps';
  return 'duration';
}

const MUSCLE_KEYWORDS: [RegExp, Muscle][] = [
  [/calf|calves/, 'calves'],
  [/hamstring|leg curl|nordic|good morning/, 'hamstrings'],
  [/glute|hip thrust|bridge|abduct/, 'glutes'],
  [/squat|leg press|lunge|quad|leg extension|step/, 'quads'],
  [/curl/, 'biceps'],
  [/tricep|pushdown|skull|kickback|extension|dip/, 'triceps'],
  [/bench|chest|fly|pec|push ?up/, 'chest'],
  [/shrug|trap/, 'traps'],
  [/pull ?up|chin|pulldown|lat/, 'lats'],
  [/row|deadlift|back/, 'back'],
  [/press|shoulder|raise|delt|face pull/, 'shoulders'],
  [/ab|crunch|plank|core|sit ?up|twist|leg raise/, 'abs'],
  [/run|walk|bike|cycl|swim|elliptical|stair|cardio|jog|treadmill|erg|rope/, 'cardio'],
];

const EQUIPMENT_KEYWORDS: [RegExp, Equipment][] = [
  [/barbell|\bbb\b|ez/, 'barbell'],
  [/dumbbell|dumbell|\bdb\b/, 'dumbbell'],
  [/cable/, 'cable'],
  [/machine|smith|press machine/, 'machine'],
  [/kettlebell|\bkb\b/, 'kettlebell'],
  [/band/, 'band'],
  [/bodyweight|push ?up|pull ?up|chin ?up|plank|dip/, 'bodyweight'],
];

/** Best guess at muscle and equipment for an exercise we couldn't match. Editable later. */
export function guessExerciseDetails(name: string): { primary: Muscle; equipment: Equipment } {
  const n = name.toLowerCase();
  const primary = MUSCLE_KEYWORDS.find(([re]) => re.test(n))?.[1] ?? 'chest';
  const equipment = EQUIPMENT_KEYWORDS.find(([re]) => re.test(n))?.[1] ?? 'other';
  return { primary, equipment };
}

/** Convert parsed workouts to app workouts. `idFor` maps imported names to exercise ids. */
export function toAppWorkouts(parsed: ParsedWorkout[], idFor: (name: string) => string): Workout[] {
  return parsed.map((p) => ({
    id: uid(),
    name: p.name,
    startedAt: p.startedAt,
    endedAt: p.endedAt,
    notes: p.notes,
    exercises: p.exercises.map((e) => ({
      id: uid(),
      exerciseId: idFor(e.name),
      notes: e.notes,
      sets: e.sets.map((s) => ({ ...s, id: uid(), done: true })),
    })),
  }));
}

/** Drop imported workouts that already exist (same name, start within a minute). */
export function withoutDuplicates(incoming: Workout[], existing: Workout[]): Workout[] {
  return incoming.filter((w) => !existing.some((e) => e.name === w.name && Math.abs(e.startedAt - w.startedAt) < 60000));
}
