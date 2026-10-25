import { ChevronRight, ClipboardPlus, MoreHorizontal, Pencil, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { confirm, toast } from '../components/Dialogs';
import { ExerciseInitial } from '../components/ExercisePicker';
import { PageHeader } from '../components/Layout';
import { Sheet } from '../components/Sheet';
import { describeSet, WorkoutEditor } from '../components/WorkoutEditor';
import { setE1RM, workoutDurationMs, workoutPRs, workoutSetCount, workoutVolume, type PRKind, type WorkoutPR } from '../lib/calc';
import { formatDate, formatTime, fromDateInput, toDateInput } from '../lib/dates';
import { formatElapsed, formatVolume, formatWeight } from '../lib/units';
import { countDoneSets, routineFromWorkout, type WorkoutUpdater } from '../lib/workoutOps';
import { exerciseName, useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Exercise, Unit, Workout } from '../types';
import { useStartWorkout } from './Home';

const PR_LABEL: Record<PRKind, string> = {
  e1rm: 'Est. 1RM',
  weight: 'Heaviest weight',
  reps: 'Most reps',
  duration: 'Longest time',
  distance: 'Longest distance',
};

function prValue(pr: WorkoutPR, ex: Exercise | undefined, unit: Unit, bw?: number): string {
  const type = ex?.type ?? 'weight_reps';
  if (pr.kind === 'e1rm') return formatWeight(setE1RM(pr.set, type, bw), unit);
  return describeSet(pr.set, type, unit);
}

export function WorkoutDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const workouts = useStore((s) => s.workouts);
  const unit = useStore((s) => s.settings.unit);
  const updateWorkout = useStore((s) => s.updateWorkout);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const bodyweight = useBodyweight();
  const { byId } = useExercises();
  const startWorkout = useStartWorkout();
  const [menu, setMenu] = useState(false);

  const workout = workouts.find((w) => w.id === id);
  const editing = params.get('edit') === '1';
  const summary = params.get('summary') === '1';

  const prs = useMemo(() => (workout ? workoutPRs(workout, workouts, byId, bodyweight) : []), [workout, workouts, byId, bodyweight]);
  const number = useMemo(() => (workout ? workouts.filter((w) => w.endedAt && w.startedAt <= workout.startedAt).length : 0), [workout, workouts]);
  const onChange = useCallback((fn: WorkoutUpdater) => id && updateWorkout(id, fn), [id, updateWorkout]);

  if (!workout) return <Navigate to="/history" replace />;

  const prsByExercise = new Map<string, WorkoutPR[]>();
  for (const pr of prs) prsByExercise.set(pr.exerciseId, [...(prsByExercise.get(pr.exerciseId) ?? []), pr]);

  const remove = async () => {
    setMenu(false);
    const ok = await confirm({ title: 'Delete workout?', message: 'This removes it from your history and stats.', confirmLabel: 'Delete', danger: true });
    if (ok) {
      deleteWorkout(workout.id);
      navigate('/history', { replace: true });
    }
  };

  const saveAsRoutine = () => {
    saveRoutine(routineFromWorkout(workout));
    setMenu(false);
    toast('Saved as a routine');
  };

  const finishEditing = () => {
    if (countDoneSets(workout) === 0) {
      deleteWorkout(workout.id);
      toast('Empty workout removed');
      navigate('/history', { replace: true });
      return;
    }
    // Drop any sets added but never ticked.
    updateWorkout(workout.id, (w) => ({
      ...w,
      exercises: w.exercises.map((we) => ({ ...we, sets: we.sets.filter((s) => s.done) })).filter((we) => we.sets.length),
    }));
    setParams({}, { replace: true });
  };

  if (editing) return <EditWorkout workout={workout} onChange={onChange} onDone={finishEditing} />;

  return (
    <div className="page">
      {summary ? (
        <div className="summary-hero">
          <div className="trophy">
            <Trophy size={44} strokeWidth={2.2} />
          </div>
          <h1>Workout complete</h1>
          <p className="secondary" style={{ margin: '8px 0 0', fontSize: 17 }}>
            Nice work — that's workout <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>#{number}</span>
            {prs.length > 0 && (
              <>
                {' '}
                with{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                  {prs.length} new PR{prs.length > 1 ? 's' : ''}
                </span>
              </>
            )}
            .
          </p>
        </div>
      ) : (
        <PageHeader
          back
          compact
          eyebrow={`${formatDate(workout.startedAt, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · ${formatTime(workout.startedAt)}`}
          title={workout.name}
          actions={
            <>
              <button className="glass-btn" aria-label="Edit workout" onClick={() => setParams({ edit: '1' })}>
                <Pencil size={17} />
              </button>
              <button className="glass-btn" aria-label="More" onClick={() => setMenu(true)}>
                <MoreHorizontal size={20} />
              </button>
            </>
          }
        />
      )}

      <div className="stat-grid" style={{ marginTop: summary ? 24 : 0 }}>
        <div className="stat">
          <div className="label">Duration</div>
          <div className="value">{formatElapsed(workoutDurationMs(workout))}</div>
        </div>
        <div className="stat">
          <div className="label">Volume</div>
          <div className="value">
            {formatVolume(workoutVolume(workout), unit, true).replace(` ${unit}`, '')}
            <small>{unit}</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">Sets</div>
          <div className="value">{workoutSetCount(workout)}</div>
        </div>
      </div>

      {prs.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Personal records</h2>
            <span className="badge gold">
              <Trophy size={12} /> {prs.length}
            </span>
          </div>
          <div className="list with-icons">
            {prs.map((pr, i) => (
              <div className="list-item" key={i}>
                <div className="tile" style={{ '--tile': 'var(--gold)' } as CSSProperties}>
                  <Trophy size={19} />
                </div>
                <div className="grow">
                  <div className="title truncate">{exerciseName(byId, pr.exerciseId)}</div>
                  <div className="sub">{PR_LABEL[pr.kind]}</div>
                </div>
                <div className="rounded-num" style={{ fontWeight: 700 }}>
                  {prValue(pr, byId.get(pr.exerciseId), unit, bodyweight)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 12 }}>Exercises</h2>
        {workout.exercises.map((we) => {
          const ex = byId.get(we.exerciseId);
          const type = ex?.type ?? 'weight_reps';
          const prSets = new Set((prsByExercise.get(we.exerciseId) ?? []).map((p) => p.set.id));
          let n = 0;
          return (
            <div className="card" key={we.id}>
              <Link to={`/exercises/${we.exerciseId}`} className="row" style={{ gap: 12, color: 'var(--text)' }}>
                <ExerciseInitial exercise={ex} small />
                <h3 className="grow truncate">{ex?.name ?? 'Unknown exercise'}</h3>
                <ChevronRight size={18} className="faint" />
              </Link>
              <div className="stack-sm" style={{ marginTop: 12, gap: 8 }}>
                {we.sets.map((s) => (
                  <div className="set-line" key={s.id}>
                    <span className={`n${s.kind === 'warmup' ? ' warmup' : ''}`}>{s.kind === 'warmup' ? 'W' : ++n}</span>
                    <span className="grow">{describeSet(s, type, unit)}</span>
                    {(type === 'weight_reps' || (type === 'reps' && bodyweight)) && s.kind !== 'warmup' && (
                      <span className="muted small rounded-num">{formatWeight(setE1RM(s, type, bodyweight), unit)}</span>
                    )}
                    {prSets.has(s.id) && <Trophy size={14} style={{ color: 'var(--gold)' }} aria-label="Personal record" />}
                  </div>
                ))}
              </div>
              {we.notes && <p className="small secondary" style={{ margin: '8px 0 0' }}>{we.notes}</p>}
            </div>
          );
        })}
      </section>

      {workout.notes && (
        <section className="section">
          <h2 style={{ marginBottom: 8 }}>Notes</h2>
          <div className="card secondary">{workout.notes}</div>
        </section>
      )}

      {summary && (
        <div className="stack" style={{ marginTop: 24 }}>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/', { replace: true })}>
            Done
          </button>
          {!workout.routineId && (
            <button className="btn btn-tinted btn-lg btn-block" onClick={saveAsRoutine}>
              <ClipboardPlus size={18} /> Save as routine
            </button>
          )}
        </div>
      )}

      {menu && (
        <Sheet title={workout.name} onClose={() => setMenu(false)}>
          <div className="menu">
            <button
              onClick={() => {
                setMenu(false);
                void startWorkout(undefined, { ...routineFromWorkout(workout), name: workout.name });
              }}
            >
              <RotateCcw size={18} /> Repeat this workout
            </button>
            <button onClick={saveAsRoutine}>
              <ClipboardPlus size={18} /> Save as routine
            </button>
            <button
              onClick={() => {
                setMenu(false);
                setParams({ edit: '1' });
              }}
            >
              <Pencil size={18} /> Edit workout
            </button>
            <button className="danger" onClick={remove}>
              <Trash2 size={18} /> Delete workout
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function EditWorkout({ workout, onChange, onDone }: { workout: Workout; onChange: (fn: WorkoutUpdater) => void; onDone: () => void }) {
  const durationMin = Math.round(workoutDurationMs(workout) / 60000);
  const time = new Date(workout.startedAt);
  const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  const setStart = (date: string, t: string) => {
    if (!date || !t) return;
    const d = new Date(fromDateInput(date));
    const [h, m] = t.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    const startedAt = d.getTime();
    onChange((w) => ({ ...w, startedAt, endedAt: startedAt + workoutDurationMs(w) }));
  };

  return (
    <div className="page no-tabs">
      <div className="navbar solid">
        <div />
        <div className="navbar-title">Edit workout</div>
        <div className="navbar-side end">
          <button className="btn btn-primary btn-sm" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input className="input" value={workout.name} onChange={(e) => onChange((w) => ({ ...w, name: e.target.value }))} />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Date</span>
            <input className="input" type="date" value={toDateInput(workout.startedAt)} onChange={(e) => setStart(e.target.value, hhmm)} />
          </label>
          <label className="field grow">
            <span>Start</span>
            <input className="input" type="time" value={hhmm} onChange={(e) => setStart(toDateInput(workout.startedAt), e.target.value)} />
          </label>
          <label className="field" style={{ width: 90 }}>
            <span>Minutes</span>
            <input
              className="input"
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => {
                const m = Number(e.target.value);
                if (Number.isFinite(m) && m >= 0) onChange((w) => ({ ...w, endedAt: w.startedAt + m * 60000 }));
              }}
            />
          </label>
        </div>
        <textarea
          className="textarea"
          placeholder="Workout notes"
          value={workout.notes ?? ''}
          onChange={(e) => onChange((w) => ({ ...w, notes: e.target.value }))}
        />
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        Tick ✓ on any set you add — unticked sets are removed when you tap Done.
      </p>
      <WorkoutEditor workout={workout} onChange={onChange} live={false} />
    </div>
  );
}
