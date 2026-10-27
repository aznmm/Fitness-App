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
  insertSet,
  moveExercise,
  patchExercise,
  patchSet,
  removeExercise,
  removeSet,
  replaceExercise,
  type WorkoutUpdater,
} from '../lib/workoutOps';
import {
  distanceUnit,
  formatDuration,
  fromKg,
  fromMetres,
  parseDuration,
  toKg,
  toMetres,
  trimNumber,
} from '../lib/units';
import { useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Exercise, SetKind, Unit, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { toast } from './Dialogs';
import { ExerciseGuide } from './ExerciseGuide';
import { ExerciseInitial, ExercisePicker } from './ExercisePicker';
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

  return (
    <section className="ex-card" aria-label={exercise?.name}>
      <div className="ex-card-head">
        <ExerciseInitial exercise={exercise} />
        <button className="name" onClick={() => navigate(`/exercises/${we.exerciseId}`)}>
          <strong className="truncate">{exercise?.name ?? 'Unknown exercise'}</strong>
          <span>
            {exercise ? MUSCLE_LABELS[exercise.primary] : ''}
            {live && ` · Rest ${restSec ? formatDuration(restSec) : 'off'}`}
          </span>
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

      {suggestion && <TargetStrip suggestion={suggestion} type={type} unit={settings.unit} onApply={() => onChange(applyTarget(we.id, suggestion))} />}

      <SetHeader type={type} unit={settings.unit} />
      {we.sets.map((set, index) => {
        const warmup = set.kind === 'warmup';
        const number = warmup ? 0 : ++workingIndex;
        const prev = warmup ? prevFor(previous.warmup, warmupIndex++) : prevFor(previous.working, number - 1);
        return (
          <SetRow
            key={set.id}
            weId={we.id}
            set={set}
            index={index}
            number={number}
            type={type}
            unit={settings.unit}
            prev={prev}
            goal={warmup ? undefined : goal}
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

function SetHeader({ type, unit }: { type: Exercise['type']; unit: Unit }) {
  const cols =
    type === 'weight_reps' ? [unit, 'Reps']
    : type === 'reps' ? [`+${unit}`, 'Reps']
    : type === 'duration' ? ['Time']
    : [distanceUnit(unit), 'Time'];
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

export function describeSet(set: Partial<WorkoutSet>, type: Exercise['type'], unit: Unit): string {
  const w = set.weight !== undefined ? trimNumber(fromKg(set.weight, unit)) : undefined;
  switch (type) {
    case 'weight_reps':
      return `${w ?? 0} ${unit} × ${set.reps ?? 0}`;
    case 'reps':
      return set.weight ? `+${w} ${unit} × ${set.reps ?? 0}` : `${set.reps ?? 0} reps`;
    case 'duration':
      return formatDuration(set.duration);
    case 'distance_duration': {
      const d = set.distance !== undefined ? `${trimNumber(fromMetres(set.distance, unit), 2)} ${distanceUnit(unit)}` : '';
      const t = set.duration !== undefined ? formatDuration(set.duration) : '';
      return [d, t].filter(Boolean).join(' · ') || '—';
    }
  }
}

const KIND_LABEL: Record<SetKind, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };

interface SetRowProps {
  weId: string;
  set: WorkoutSet;
  /** Position in the exercise's sets, to put it back on undo. */
  index: number;
  number: number;
  type: Exercise['type'];
  unit: Unit;
  prev?: WorkoutSet;
  /** Today's aim for this set: the smart suggestion or a routine target. */
  goal?: Pick<WorkoutSet, 'weight' | 'reps' | 'duration'>;
  records?: ExerciseRecords;
  bodyweight?: number;
  onChange: (fn: WorkoutUpdater) => void;
  onDone: () => void;
}

const SetRow = memo(function SetRow({ weId, set, index, number, type, unit, prev, goal, records, bodyweight, onChange, onDone }: SetRowProps) {
  const patch = (p: Partial<WorkoutSet>) => onChange(patchSet(weId, set.id, p));
  const remove = () => {
    onChange(removeSet(weId, set.id));
    toast(set.kind === 'warmup' ? 'Warm-up set deleted' : `Set ${number} deleted`, { label: 'Undo', run: () => onChange(insertSet(weId, set, index)) });
  };
  const fmtWeight = useCallback((kg: number) => trimNumber(fromKg(kg, unit), 2), [unit]);
  const parseWeight = useCallback((s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isNaN(n) ? undefined : toKg(n, unit);
  }, [unit]);
  const fmtDist = useCallback((m: number) => trimNumber(fromMetres(m, unit), 2), [unit]);
  const parseDist = useCallback((s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isNaN(n) ? undefined : toMetres(n, unit);
  }, [unit]);
  const parseReps = useCallback((s: string) => {
    const n = Number(s);
    return Number.isInteger(n) ? n : undefined;
  }, []);

  // Placeholders: today's goal when there is one, else last time's numbers.
  const ph = goal
    ? { weight: goal.weight, reps: goal.reps, duration: goal.duration ?? prev?.duration, distance: prev?.distance }
    : { weight: prev?.weight, reps: prev?.reps, duration: prev?.duration, distance: prev?.distance };

  const toggleDone = () => {
    if (set.done) {
      patch({ done: false });
      return;
    }
    const filled: Partial<WorkoutSet> = {
      weight: set.weight ?? ph.weight,
      reps: set.reps ?? ph.reps,
      duration: set.duration ?? ph.duration,
      distance: set.distance ?? ph.distance,
    };
    const missing =
      (type === 'weight_reps' || type === 'reps') ? !filled.reps
      : type === 'duration' ? !filled.duration
      : !filled.duration && !filled.distance;
    if (missing) {
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
      aria-label={type === 'reps' ? 'Added weight' : 'Weight'}
      placeholder={ph.weight !== undefined ? fmtWeight(ph.weight) : type === 'reps' ? '0' : '—'}
      value={set.weight}
      onValue={(v) => patch({ weight: v })}
      format={fmtWeight}
      parse={parseWeight}
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

  return (
    <SwipeToDelete onDelete={remove} label={`Delete set ${number || 'warm-up'}`}>
      <div className={`set-grid set-row${set.done ? ' done' : ''}${cols1 ? ' cols-1' : ''}`}>
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
        <button
          className="prev"
          disabled={!prev}
          onClick={() => prev && patch({ weight: prev.weight, reps: prev.reps, duration: prev.duration, distance: prev.distance })}
          aria-label={prev ? `Copy previous: ${describeSet(prev, type, unit)}` : 'No previous set'}
        >
          {prs.length ? (
            <span className="pr-tag">
              <Trophy size={11} strokeWidth={2.5} /> PR
            </span>
          ) : prev ? (
            describeSet(prev, type, unit)
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
        <button className="check" onClick={toggleDone} aria-label={set.done ? 'Mark set not done' : 'Complete set'} aria-pressed={set.done}>
          <Check size={19} strokeWidth={3.2} />
        </button>
      </div>
    </SwipeToDelete>
  );
});
