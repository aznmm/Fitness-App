import { ArrowDown, ArrowUp, MoreHorizontal, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { confirm, toast } from '../components/Dialogs';
import { ExerciseTile, ExercisePicker } from '../components/ExercisePicker';
import { PageHeader } from '../components/Layout';
import { NumberInput } from '../components/NumberInput';
import { Sheet } from '../components/Sheet';
import { isCardio } from '../lib/cardio';
import { uid } from '../lib/id';
import { LIMITS } from '../lib/limits';
import { formatDuration, fromKg, parseDecimal, parseWholeNumber, toKg, trimNumber } from '../lib/units';
import { exerciseName, useExercises, useStore } from '../store/useStore';
import type { Routine, RoutineExercise } from '../types';
import { useStartWorkout } from './Home';

const REST_CHOICES = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const NEW_NAME = 'New routine';

/**
 * A routine left exactly as "Build a routine" made it (no name, notes or
 * exercises) is deleted once the editor closes, so backing out leaves nothing behind.
 */
function useDropIfUntouched(id: string | undefined) {
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  useEffect(
    () => () => {
      // Wait a tick: React's dev double-mount, or a re-render of this same page, isn't leaving it.
      setTimeout(() => {
        if (!id || window.location.hash.startsWith(`#/routines/${id}`)) return;
        const r = useStore.getState().routines.find((x) => x.id === id);
        if (r && !r.exercises.length && !r.notes && [NEW_NAME, ''].includes(r.name.trim())) deleteRoutine(id);
      }, 0);
    },
    [id, deleteRoutine],
  );
}
const int = (s: string) => {
  const n = parseWholeNumber(s);
  return n !== undefined && n <= LIMITS.reps ? n : undefined;
};

export function RoutineEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const routine = useStore((s) => s.routines.find((r) => r.id === id));
  const saveRoutine = useStore((s) => s.saveRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const settings = useStore((s) => s.settings);
  const { byId } = useExercises();
  const start = useStartWorkout();
  const [picking, setPicking] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  useDropIfUntouched(id);

  if (!routine) return <Navigate to="/routines" replace />;

  const update = (patch: Partial<Routine>) => saveRoutine({ ...routine, ...patch });
  const updateEx = (exId: string, patch: Partial<RoutineExercise>) =>
    update({ exercises: routine.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) });
  const restDefault = (exerciseId: string) => (isCardio(byId.get(exerciseId)) ? 0 : settings.defaultRestSec);
  // Reads the saved routine at undo time, so edits made since are kept.
  const restoreEx = (re: RoutineExercise, i: number) => {
    const current = useStore.getState().routines.find((r) => r.id === routine.id);
    if (!current || current.exercises.some((e) => e.id === re.id)) return;
    saveRoutine({ ...current, exercises: [...current.exercises.slice(0, i), re, ...current.exercises.slice(i)] });
  };
  const move = (i: number, d: number) => {
    const list = [...routine.exercises];
    [list[i], list[i + d]] = [list[i + d], list[i]];
    update({ exercises: list });
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete routine?', message: 'Past workouts stay in your history.', confirmLabel: 'Delete', danger: true });
    if (ok) {
      deleteRoutine(routine.id);
      navigate('/routines', { replace: true });
    }
  };

  return (
    <div className="page no-tabs">
      <PageHeader back="/routines" title={params.get('new') ? 'New routine' : 'Edit routine'} />

      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input
            className="input"
            value={routine.name}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => !routine.name.trim() && update({ name: NEW_NAME })}
            autoFocus={!!params.get('new')}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea className="textarea" value={routine.notes ?? ''} placeholder="Optional" onChange={(e) => update({ notes: e.target.value })} rows={2} />
        </label>
      </div>

      <section className="section">
        <h2 style={{ marginBottom: 12 }}>Exercises</h2>
        {routine.exercises.map((re, i) => (
          <div className="card tight" key={re.id}>
            <div className="row" style={{ gap: 4 }}>
              <ExerciseTile exercise={byId.get(re.exerciseId)} small />
              <h3 className="truncate grow" style={{ marginLeft: 8 }}>
                {exerciseName(byId, re.exerciseId)}
              </h3>
              <button className="glass-btn" aria-label={`${exerciseName(byId, re.exerciseId)} options`} onClick={() => setMenuFor(re.id)}>
                <MoreHorizontal size={18} />
              </button>
            </div>
            {menuFor === re.id && (
              <Sheet title={exerciseName(byId, re.exerciseId)} onClose={() => setMenuFor(null)}>
                <div className="menu">
                  {i > 0 && (
                    <button
                      onClick={() => {
                        move(i, -1);
                        setMenuFor(null);
                      }}
                    >
                      <ArrowUp size={18} /> Move up
                    </button>
                  )}
                  {i < routine.exercises.length - 1 && (
                    <button
                      onClick={() => {
                        move(i, 1);
                        setMenuFor(null);
                      }}
                    >
                      <ArrowDown size={18} /> Move down
                    </button>
                  )}
                  <button
                    className="danger"
                    onClick={() => {
                      update({ exercises: routine.exercises.filter((e) => e.id !== re.id) });
                      setMenuFor(null);
                      toast(`Removed ${exerciseName(byId, re.exerciseId)}`, { label: 'Undo', run: () => restoreEx(re, i) });
                    }}
                  >
                    <Trash2 size={18} /> Remove exercise
                  </button>
                </div>
              </Sheet>
            )}
            <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <label className="field grow">
                <span>Sets</span>
                <NumberInput className="set-input" inputMode="numeric" value={re.sets} onValue={(v) => v && updateEx(re.id, { sets: Math.min(20, v) })} format={String} parse={int} />
              </label>
              <label className="field grow">
                <span>Reps</span>
                <NumberInput className="set-input" inputMode="numeric" placeholder="—" value={re.reps} onValue={(v) => updateEx(re.id, { reps: v || undefined })} format={String} parse={int} />
              </label>
              <label className="field grow">
                <span>{settings.unit}</span>
                <NumberInput
                  className="set-input"
                  inputMode="decimal"
                  placeholder="—"
                  value={re.weight}
                  onValue={(v) => updateEx(re.id, { weight: v || undefined })}
                  format={(kg) => trimNumber(fromKg(kg, settings.unit), 2)}
                  parse={(s) => {
                    const n = parseDecimal(s);
                    return n === undefined || toKg(n, settings.unit) > LIMITS.weightKg ? undefined : toKg(n, settings.unit);
                  }}
                />
              </label>
              <label className="field grow">
                <span>Rest</span>
                <select
                  className="select"
                  value={re.restSec ?? restDefault(re.exerciseId)}
                  onChange={(e) => updateEx(re.id, { restSec: Number(e.target.value) })}
                  style={{ minHeight: 36, height: 36, padding: '0 22px 0 8px', fontFamily: 'var(--font-rounded)', fontWeight: 600, backgroundPosition: 'calc(100% - 13px) 52%, calc(100% - 8px) 52%' }}
                >
                  {[...new Set([...REST_CHOICES, re.restSec ?? restDefault(re.exerciseId)])]
                    .sort((a, b) => a - b)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s ? formatDuration(s) : 'Off'}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </div>
        ))}
        <button className="btn btn-tinted btn-block btn-lg" style={{ marginTop: 14 }} onClick={() => setPicking(true)}>
          <Plus size={20} strokeWidth={2.5} /> Add exercises
        </button>
      </section>

      {routine.exercises.length > 0 && (
        <button className="btn btn-hero btn-lg btn-block" style={{ marginTop: 12 }} onClick={() => start(routine.id)}>
          <Play size={18} fill="currentColor" /> Start workout
        </button>
      )}

      <button className="btn btn-plain-danger btn-block" style={{ marginTop: 24 }} onClick={remove}>
        <Trash2 size={17} /> Delete routine
      </button>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            update({
              exercises: [
                ...routine.exercises,
                ...ids.map((exerciseId) => ({
                  id: uid(),
                  exerciseId,
                  sets: byId.get(exerciseId)?.type === 'distance_duration' ? 1 : 3,
                  reps: byId.get(exerciseId)?.type === 'weight_reps' || byId.get(exerciseId)?.type === 'reps' ? 10 : undefined,
                })),
              ],
            });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
