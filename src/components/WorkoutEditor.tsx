import { ArrowDown, ArrowUp, BookOpen, Check, Disc3, Flame, MessageSquare, MoreHorizontal, Plus, Repeat, Target, Timer, Trash2, Trophy } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MUSCLE_LABELS } from '../data/exercises';
import { exerciseRecords, lastPerformance, setPRs, type ExerciseRecords } from '../lib/calc';
import { primeAudio } from '../lib/feedback';
import { defaultBarKg, suggestNext, warmupSets, type Suggestion } from '../lib/progression';
import {
  addExercises,
  addSet,
  addWarmups,
  applyTarget,
  completeSets,
  insertSet,
  moveExercise,
  patchExercise,
  patchSet,
  removeExercise,
  removeSet,
  replaceExercise,
  uncompleteSets,
  type WorkoutUpdater,
} from '../lib/workoutOps';
import { cardioRate, distanceSpec, formatCardioDistance } from '../lib/cardio';
import { formatDuration, fromKg, parseDuration, toKg, trimNumber } from '../lib/units';
import { useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Exercise, SetKind, Unit, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { toast } from './Dialogs';
import { ExerciseGuide } from './ExerciseGuide';
import { ExerciseTile, ExercisePicker } from './ExercisePicker';
import { SwipeToDelete } from './SwipeToDelete';
import { NumberInput } from './NumberInput';
import { PlateCalculator } from './PlateCalculator';
import { Sheet } from './Sheet';

interface EditorProps {
  workout: Workout;
  onChange: (fn: WorkoutUpdater) => void;
  /** Live = the workout in progress: completing a set starts the rest timer. */
  live: boolean;
}

export function WorkoutEditor({ workout, onChange, live }: EditorProps) {
  const { byId } = useExercises();
  const allWorkouts = useStore((s) => s.workouts);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'replace'; weId: string } | null>(null);
  const history = useMemo(() => allWorkouts.filter((w) => w.id !== workout.id), [allWorkouts, workout.id]);

  return (
    <>
      {workout.exercises.map((we, i) => (
        <ExerciseCard
          key={we.id}
          we={we}
          exercise={byId.get(we.exerciseId)}
          history={history}
          before={workout.startedAt}
          live={live}
          isFirst={i === 0}
          isLast={i === workout.exercises.length - 1}
          onChange={onChange}
          onReplace={() => setPicker({ mode: 'replace', weId: we.id })}
        />
      ))}

      <button className="btn btn-tinted btn-block btn-lg" style={{ marginTop: 16 }} onClick={() => setPicker({ mode: 'add' })}>
        <Plus size={20} strokeWidth={2.5} /> Add exercise
      </button>

      {picker && (
        <ExercisePicker
          title={picker.mode === 'add' ? 'Add exercises' : 'Replace exercise'}
          multi={picker.mode === 'add'}
          onClose={() => setPicker(null)}
          onPick={(ids) => {
            if (picker.mode === 'add') onChange(addExercises(ids, byId, history));
            else onChange(replaceExercise(picker.weId, ids[0]));
            setPicker(null);
          }}
        />
      )}
    </>
  );
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

interface CardProps {
  we: WorkoutExercise;
  exercise: Exercise | undefined;
  history: Workout[];
  before: number;
  live: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (fn: WorkoutUpdater) => void;
  onReplace: () => void;
}

const ExerciseCard = memo(function ExerciseCard({ we, exercise, history, before, live, isFirst, isLast, onChange, onReplace }: CardProps) {
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const startRest = useStore((s) => s.startRest);
  const bodyweight = useBodyweight();
  const [menu, setMenu] = useState(false);
  const [plates, setPlates] = useState(false);
  const [guide, setGuide] = useState(false);
  const [showNotes, setShowNotes] = useState(!!we.notes);

  const type = exercise?.type ?? 'weight_reps';
  const previous = useMemo(() => {
    const sets = lastPerformance(history, we.exerciseId, before);
    return { warmup: sets.filter((s) => s.kind === 'warmup'), working: sets.filter((s) => s.kind !== 'warmup') };
  }, [history, we.exerciseId, before]);
  const records = useMemo(
    () => (exercise ? exerciseRecords(history, exercise, bodyweight, before) : undefined),
    [history, exercise, bodyweight, before],
  );
  const restSec = we.restSec ?? settings.defaultRestSec;
  const suggestion = useMemo(
    () => (exercise && settings.smartSuggestions ? suggestNext(exercise, history, before, settings.unit, we.target) : null),
    [exercise, history, before, settings.unit, settings.smartSuggestions, we.target],
  );
  const loadable = type === 'weight_reps' && exercise?.equipment !== 'bodyweight';
  const firstWorkingKg =
    we.sets.find((s) => s.kind !== 'warmup' && s.weight)?.weight ?? suggestion?.weight ?? Math.max(0, ...previous.working.map((s) => s.weight ?? 0));
  const barKg = settings.barKg ?? defaultBarKg(settings.unit);

  const onSetDone = useCallback(() => {
    if (!live) return;
    primeAudio();
    if (settings.autoRestTimer) startRest(restSec);
  }, [live, settings.autoRestTimer, startRest, restSec]);

  let workingIndex = 0;
  let warmupIndex = 0;
  // Warm-ups line up with last time's warm-ups, working sets with working sets.
  const prevFor = (list: WorkoutSet[], i: number) => list[i] ?? list[list.length - 1];
  const hasHistory = previous.warmup.length + previous.working.length > 0;
  // Working sets aim for the suggestion; without one, a routine target only applies on a first-ever session.
  const goal = suggestion ?? (hasHistory ? undefined : we.target);
  const rows = we.sets.map((set, index) => {
    const warmup = set.kind === 'warmup';
    const number = warmup ? 0 : ++workingIndex;
    const prev = warmup ? prevFor(previous.warmup, warmupIndex++) : prevFor(previous.working, number - 1);
    return { set, index, number, prev, goal: warmup ? undefined : goal };
  });
  const allDone = we.sets.length > 0 && we.sets.every((s) => s.done);

  // One tap for the whole exercise: every set is saved with what was typed, else the target or last time.
  const toggleExercise = () => {
    if (allDone) {
      onChange(uncompleteSets(we.id));
      return;
    }
    const values: Record<string, Partial<WorkoutSet>> = {};
    let missing = 0;
    for (const r of rows) {
      if (r.set.done) continue;
      const v = tickValues(r.set, type, r.goal, r.prev);
      if (v) values[r.set.id] = v;
      else missing++;
    }
    const need = type === 'duration' ? 'a time' : type === 'distance_duration' ? 'a distance or time' : 'reps';
    if (!Object.keys(values).length) {
      toast(`Enter ${need} first`);
      return;
    }
    onChange(completeSets(we.id, values));
    if (missing) toast(`${missing} set${missing > 1 ? 's' : ''} still need${missing > 1 ? '' : 's'} ${need}`);
    onSetDone();
  };

  return (
    <section className="ex-card" aria-label={exercise?.name}>
      <div className="ex-card-head">
        <ExerciseTile exercise={exercise} />
        <button className="name" onClick={() => navigate(`/exercises/${we.exerciseId}`)}>
          <strong className="truncate">{exercise?.name ?? 'Unknown exercise'}</strong>
          <span>
            {exercise ? MUSCLE_LABELS[exercise.primary] : ''}
            {live && ` · Rest ${restSec ? formatDuration(restSec) : 'off'}`}
          </span>
        </button>
        <button
          className={`ex-check${allDone ? ' on' : ''}`}
          onClick={toggleExercise}
          disabled={!we.sets.length}
          aria-label={allDone ? `Mark ${exercise?.name ?? 'exercise'} not done` : `Complete ${exercise?.name ?? 'exercise'}`}
          aria-pressed={allDone}
        >
          <Check size={19} strokeWidth={3.2} />
        </button>
        <button className="glass-btn" style={{ width: 34, height: 34 }} aria-label="Exercise options" onClick={() => setMenu(true)}>
          <MoreHorizontal size={19} />
        </button>
      </div>

      {showNotes && (
        <div className="ex-notes">
          <textarea
            className="textarea"
            placeholder="Notes (seat height, grip, how it felt…)"
            value={we.notes ?? ''}
            onChange={(e) => onChange(patchExercise(we.id, { notes: e.target.value }))}
            rows={1}
          />
        </div>
      )}

      {suggestion && !allDone && <TargetStrip suggestion={suggestion} type={type} unit={settings.unit} onApply={() => onChange(applyTarget(we.id, suggestion))} />}

      <SetHeader exercise={exercise} type={type} unit={settings.unit} />
      {rows.map(({ set, index, number, prev, goal }) => {
        return (
          <SetRow
            key={set.id}
            weId={we.id}
            set={set}
            index={index}
            number={number}
            exercise={exercise}
            type={type}
            unit={settings.unit}
            prev={prev}
            goal={goal}
            records={records}
            bodyweight={bodyweight}
            onChange={onChange}
            onDone={onSetDone}
          />
        );
      })}

      <button className="btn btn-sm btn-block add-set" onClick={() => onChange(addSet(we.id))}>
        <Plus size={16} strokeWidth={2.5} /> Add set
      </button>

      {menu && (
        <Sheet title={exercise?.name ?? 'Exercise'} onClose={() => setMenu(false)}>
          <div className="menu">
            {exercise && !exercise.custom && (
              <button
                onClick={() => {
                  setMenu(false);
                  setGuide(true);
                }}
              >
                <BookOpen size={18} /> How to do it
              </button>
            )}
            <button
              onClick={() => {
                setShowNotes(true);
                setMenu(false);
              }}
            >
              <MessageSquare size={18} /> {we.notes ? 'Edit note' : 'Add note'}
            </button>
            <label>
              <Timer size={18} />
              <span className="grow">Rest timer</span>
              <select
                className="select"
                style={{ width: 'auto', minHeight: 34, padding: '4px 30px 4px 12px' }}
                value={restSec}
                onChange={(e) => onChange(patchExercise(we.id, { restSec: Number(e.target.value) }))}
              >
                {[...new Set([...REST_OPTIONS, restSec])]
                  .sort((a, b) => a - b)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s ? formatDuration(s) : 'Off'}
                    </option>
                  ))}
              </select>
            </label>
            {loadable && firstWorkingKg > 0 && (
              <button
                onClick={() => {
                  onChange(addWarmups(we.id, warmupSets(exercise!, firstWorkingKg, settings.unit, barKg)));
                  setMenu(false);
                }}
              >
                <Flame size={18} /> Add warm-up sets
              </button>
            )}
            {exercise?.equipment === 'barbell' && (
              <button
                onClick={() => {
                  setMenu(false);
                  setPlates(true);
                }}
              >
                <Disc3 size={18} /> Plate calculator
              </button>
            )}
            <button
              onClick={() => {
                setMenu(false);
                onReplace();
              }}
            >
              <Repeat size={18} /> Replace exercise
            </button>
            {!isFirst && (
              <button
                onClick={() => {
                  onChange(moveExercise(we.id, -1));
                  setMenu(false);
                }}
              >
                <ArrowUp size={18} /> Move up
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => {
                  onChange(moveExercise(we.id, 1));
                  setMenu(false);
                }}
              >
                <ArrowDown size={18} /> Move down
              </button>
            )}
            <button
              className="danger"
              onClick={() => {
                onChange(removeExercise(we.id));
                setMenu(false);
              }}
            >
              <Trash2 size={18} /> Remove exercise
            </button>
          </div>
        </Sheet>
      )}
      {plates && <PlateCalculator initialKg={firstWorkingKg || undefined} onClose={() => setPlates(false)} />}
      {guide && exercise && (
        <Sheet title={exercise.name} onClose={() => setGuide(false)}>
          <ExerciseGuide exercise={exercise} mapHeight={180} />
        </Sheet>
      )}
    </section>
  );
});

function TargetStrip({ suggestion, type, unit, onApply }: { suggestion: Suggestion; type: Exercise['type']; unit: Unit; onApply: () => void }) {
  return (
    <div className={`target-strip ${suggestion.reason}`}>
      <Target size={18} className="target-icon" aria-hidden />
      <div className="grow">
        <div className="target-value rounded-num">
          {type === 'duration'
            ? formatDuration(suggestion.duration)
            : suggestion.weight === undefined && suggestion.reps
              ? `${suggestion.reps} reps`
              : describeSet(suggestion, type, unit)}
        </div>
        <div className="target-note">{suggestion.note}</div>
      </div>
      <button className="btn btn-sm btn-tinted" onClick={onApply}>
        Use
      </button>
    </div>
  );
}

function columnsFor(type: Exercise['type']): number {
  return type === 'duration' ? 1 : 2;
}

/** Cardio is logged as distance/time plus calories, with last time and the pace on a line underneath. */
function isCardio(exercise: Exercise | undefined): boolean {
  return exercise?.primary === 'cardio' && (exercise.type === 'duration' || exercise.type === 'distance_duration');
}

function SetHeader({ exercise, type, unit }: { exercise?: Exercise; type: Exercise['type']; unit: Unit }) {
  if (isCardio(exercise)) {
    const cols = type === 'distance_duration' ? [distanceSpec(exercise, unit).label, 'Time', 'kcal'] : ['Time', 'kcal'];
    return (
      <div className={`set-grid head cardio${cols.length === 2 ? ' cols-2' : ''}`}>
        <span>Set</span>
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
        <span aria-hidden />
      </div>
    );
  }
  const cols =
    type === 'weight_reps' ? [unit, 'Reps']
    : type === 'reps' ? [exercise?.assisted ? 'Assist' : `+${unit}`, 'Reps']
    : type === 'duration' ? ['Time']
    : [distanceSpec(exercise, unit).label, 'Time'];
  return (
    <div className={`set-grid head${columnsFor(type) === 1 ? ' cols-1' : ''}`}>
      <span>Set</span>
      <span>Previous</span>
      {cols.map((c) => (
        <span key={c}>{c}</span>
      ))}
      <span aria-hidden />
    </div>
  );
}

type ExerciseLike = Exercise['type'] | (Pick<Exercise, 'type'> & Partial<Pick<Exercise, 'distanceScale'>>);

/** One-line summary of a set: "100 lb × 5", "−40 lb × 8" (assisted), "3.1 mi · 28:00 · 310 kcal". */
export function describeSet(set: Partial<WorkoutSet>, ex: ExerciseLike, unit: Unit): string {
  const e = typeof ex === 'string' ? { type: ex } : ex;
  const w = set.weight !== undefined ? trimNumber(fromKg(Math.abs(set.weight), unit)) : undefined;
  const kcal = set.calories ? `${set.calories} kcal` : '';
  switch (e.type) {
    case 'weight_reps':
      return `${w ?? 0} ${unit} × ${set.reps ?? 0}`;
    case 'reps':
      return set.weight ? `${set.weight > 0 ? '+' : '−'}${w} ${unit} × ${set.reps ?? 0}` : `${set.reps ?? 0} reps`;
    case 'duration':
      return [set.duration !== undefined || !kcal ? formatDuration(set.duration) : '', kcal].filter(Boolean).join(' · ');
    case 'distance_duration': {
      const d = set.distance !== undefined ? formatCardioDistance(set.distance, distanceSpec(e, unit)) : '';
      const t = set.duration !== undefined ? formatDuration(set.duration) : '';
      return [d, t, kcal].filter(Boolean).join(' · ') || '—';
    }
  }
}

const KIND_LABEL: Record<SetKind, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };

type Goal = Pick<WorkoutSet, 'weight' | 'reps' | 'duration'>;

/** Greyed-out hints in empty fields: today's goal when there is one, else last time's numbers. */
function placeholders(goal?: Goal, prev?: WorkoutSet) {
  return goal
    ? { weight: goal.weight, reps: goal.reps, duration: goal.duration ?? prev?.duration, distance: prev?.distance }
    : { weight: prev?.weight, reps: prev?.reps, duration: prev?.duration, distance: prev?.distance };
}

/** What a set is saved with when ticked: what was typed, else its hints. Null when the main number is missing. */
function tickValues(set: WorkoutSet, type: Exercise['type'], goal?: Goal, prev?: WorkoutSet): Partial<WorkoutSet> | null {
  const ph = placeholders(goal, prev);
  const filled: Partial<WorkoutSet> = {
    weight: set.weight ?? ph.weight,
    reps: set.reps ?? ph.reps,
    duration: set.duration ?? ph.duration,
    distance: set.distance ?? ph.distance,
  };
  const missing =
    type === 'weight_reps' || type === 'reps' ? !filled.reps
    : type === 'duration' ? !filled.duration && !set.calories
    : !filled.duration && !filled.distance && !set.calories;
  return missing ? null : filled;
}

interface SetRowProps {
  weId: string;
  set: WorkoutSet;
  /** Position in the exercise's sets, to put it back on undo. */
  index: number;
  number: number;
  exercise?: Exercise;
  type: Exercise['type'];
  unit: Unit;
  prev?: WorkoutSet;
  /** Today's aim for this set: the smart suggestion or a routine target. */
  goal?: Goal;
  records?: ExerciseRecords;
  bodyweight?: number;
  onChange: (fn: WorkoutUpdater) => void;
  onDone: () => void;
}

const SetRow = memo(function SetRow({ weId, set, index, number, exercise, type, unit, prev, goal, records, bodyweight, onChange, onDone }: SetRowProps) {
  const patch = (p: Partial<WorkoutSet>) => onChange(patchSet(weId, set.id, p));
  const remove = () => {
    onChange(removeSet(weId, set.id));
    toast(set.kind === 'warmup' ? 'Warm-up set deleted' : `Set ${number} deleted`, { label: 'Undo', run: () => onChange(insertSet(weId, set, index)) });
  };
  // Assisted machines: type the assistance as a positive number; it's stored as negative added weight.
  const assist = !!exercise?.assisted;
  const fmtWeight = useCallback((kg: number) => trimNumber(fromKg(assist ? Math.abs(kg) : kg, unit), 2), [unit, assist]);
  const parseWeight = useCallback((s: string) => {
    const n = Number(s.replace(',', '.'));
    if (Number.isNaN(n)) return undefined;
    return assist ? -Math.abs(toKg(n, unit)) || 0 : toKg(n, unit);
  }, [unit, assist]);
  const spec = distanceSpec(exercise, unit);
  const fmtDist = useCallback((m: number) => trimNumber(m / spec.metres, spec.label === 'mi' || spec.label === 'km' ? 2 : 0), [spec.metres, spec.label]);
  const parseDist = useCallback((s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isNaN(n) ? undefined : n * spec.metres;
  }, [spec.metres]);
  const parseReps = useCallback((s: string) => {
    const n = Number(s);
    return Number.isInteger(n) ? n : undefined;
  }, []);
  const parseCalories = useCallback((s: string) => {
    const n = Math.round(Number(s.replace(',', '.')));
    return Number.isNaN(n) ? undefined : n;
  }, []);

  const ph = placeholders(goal, prev);

  const toggleDone = () => {
    if (set.done) {
      patch({ done: false });
      return;
    }
    const filled = tickValues(set, type, goal, prev);
    if (!filled) {
      toast(type === 'duration' ? 'Enter a time first' : type === 'distance_duration' ? 'Enter a distance or time first' : 'Enter reps first');
      return;
    }
    patch({ ...filled, done: true });
    onDone();
  };

  const prs = set.done && records ? setPRs(set, type, records, bodyweight) : [];
  const cols1 = columnsFor(type) === 1;

  const weightInput = (
    <NumberInput
      className="set-input"
      inputMode="decimal"
      aria-label={assist ? 'Assistance' : type === 'reps' ? 'Added weight' : 'Weight'}
      placeholder={ph.weight !== undefined ? fmtWeight(ph.weight) : type === 'reps' ? '0' : '—'}
      value={set.weight}
      onValue={(v) => patch({ weight: v })}
      format={fmtWeight}
      parse={parseWeight}
      allowNegative={assist}
    />
  );
  const repsInput = (
    <NumberInput
      className="set-input"
      inputMode="numeric"
      aria-label="Reps"
      placeholder={ph.reps !== undefined ? String(ph.reps) : '—'}
      value={set.reps}
      onValue={(v) => patch({ reps: v })}
      format={String}
      parse={parseReps}
    />
  );
  const durationInput = (
    <NumberInput
      className="set-input"
      inputMode="numeric"
      aria-label="Time"
      placeholder={ph.duration !== undefined ? formatDuration(ph.duration) : '0:00'}
      value={set.duration}
      onValue={(v) => patch({ duration: v })}
      format={formatDuration}
      parse={parseDuration}
    />
  );
  const distanceInput = (
    <NumberInput
      className="set-input"
      inputMode="decimal"
      aria-label="Distance"
      placeholder={ph.distance !== undefined ? fmtDist(ph.distance) : '—'}
      value={set.distance}
      onValue={(v) => patch({ distance: v })}
      format={fmtDist}
      parse={parseDist}
    />
  );
  const caloriesInput = (
    <NumberInput
      className="set-input"
      inputMode="numeric"
      aria-label="Calories"
      placeholder="—"
      value={set.calories}
      onValue={(v) => patch({ calories: v })}
      format={String}
      parse={parseCalories}
    />
  );
  const badge = (
    <div className={`set-badge ${set.kind}`}>
      {KIND_LABEL[set.kind] || number}
      <select
        aria-label={`Set ${number || 'warm-up'} options`}
        value={set.kind}
        onChange={(e) => {
          if (e.target.value === 'delete') remove();
          else patch({ kind: e.target.value as SetKind });
        }}
      >
        <option value="normal">Normal set</option>
        <option value="warmup">Warm-up set</option>
        <option value="drop">Drop set</option>
        <option value="failure">Failure set</option>
        <option value="delete">Delete set</option>
      </select>
    </div>
  );
  const check = (
    <button className="check" onClick={toggleDone} aria-label={set.done ? 'Mark set not done' : 'Complete set'} aria-pressed={set.done}>
      <Check size={19} strokeWidth={3.2} />
    </button>
  );
  const copyPrev = () => prev && patch({ weight: prev.weight, reps: prev.reps, duration: prev.duration, distance: prev.distance });

  if (exercise && isCardio(exercise)) {
    const rate = type === 'distance_duration' ? cardioRate(set.distance && set.duration ? set : { distance: ph.distance, duration: ph.duration }, exercise, unit) : null;
    return (
      <SwipeToDelete onDelete={remove} label={`Delete set ${number || 'warm-up'}`}>
        <div className={`set-grid set-row cardio${set.done ? ' done' : ''}${type === 'duration' ? ' cols-2' : ''}`}>
          {badge}
          {type === 'distance_duration' && distanceInput}
          {durationInput}
          {caloriesInput}
          {check}
          <button className="cardio-line" onClick={copyPrev} disabled={!prev} aria-label={prev ? `Copy last time: ${describeSet(prev, exercise, unit)}` : undefined}>
            {prs.length ? (
              <span className="pr-tag">
                <Trophy size={11} strokeWidth={2.5} /> PR
              </span>
            ) : null}
            <span className="truncate">
              {prev ? `Last ${describeSet(prev, exercise, unit)}` : 'First time'}
              {rate && <strong> · {rate}</strong>}
            </span>
          </button>
        </div>
      </SwipeToDelete>
    );
  }

  return (
    <SwipeToDelete onDelete={remove} label={`Delete set ${number || 'warm-up'}`}>
      <div className={`set-grid set-row${set.done ? ' done' : ''}${cols1 ? ' cols-1' : ''}`}>
        {badge}
        <button className="prev" disabled={!prev} onClick={copyPrev} aria-label={prev ? `Copy previous: ${describeSet(prev, exercise ?? type, unit)}` : 'No previous set'}>
          {prs.length ? (
            <span className="pr-tag">
              <Trophy size={11} strokeWidth={2.5} /> PR
            </span>
          ) : prev ? (
            describeSet(prev, exercise ?? type, unit)
          ) : (
            '—'
          )}
        </button>
        {type === 'weight_reps' || type === 'reps' ? (
          <>
            {weightInput}
            {repsInput}
          </>
        ) : type === 'duration' ? (
          durationInput
        ) : (
          <>
            {distanceInput}
            {durationInput}
          </>
        )}
        {check}
      </div>
    </SwipeToDelete>
  );
});
