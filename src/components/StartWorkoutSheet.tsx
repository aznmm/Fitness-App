import { CalendarCheck, ClipboardList, Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { muscleClass } from '../data/exercises';
import { relativeDayInline } from '../lib/dates';
import { uid } from '../lib/id';
import type { DayPlan } from '../lib/plans';
import { useExercises, useStore } from '../store/useStore';
import type { Routine } from '../types';
import { Sheet } from './Sheet';

/** Creates an empty routine and returns its id; opens the editor unless told not to. */
export function useCreateRoutine() {
  const saveRoutine = useStore((s) => s.saveRoutine);
  const navigate = useNavigate();
  return (open = true) => {
    const id = uid();
    saveRoutine({ id, name: 'New routine', exercises: [], createdAt: Date.now() });
    if (open) navigate(`/routines/${id}?new=1`);
    return id;
  };
}

/** Tile colour for a routine: the group of its first exercise. */
export function useRoutineTile() {
  const { byId } = useExercises();
  return (r: Routine) => muscleClass(byId.get(r.exercises[0]?.exerciseId ?? '')?.primary) || 'm-cardio';
}

interface Props {
  /** Today's planned routine, offered first. */
  plan: DayPlan | null;
  onStart: (routineId?: string) => void;
  onClose: () => void;
}

/** Asks which routine to do before starting a workout. */
export function StartWorkoutSheet({ plan, onStart, onClose }: Props) {
  const routines = useStore((s) => s.routines);
  const createRoutine = useCreateRoutine();
  const others = routines
    .filter((r) => r.id !== plan?.routine.id)
    .sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt));

  return (
    <Sheet title="Start a workout" onClose={onClose}>
      {plan && (
        <>
          <div className="list-header row" style={{ gap: 6 }}>
            <CalendarCheck size={14} /> Planned for today
          </div>
          <div className="list with-icons" style={{ marginBottom: 20 }}>
            <RoutineRow routine={plan.routine} onStart={onStart} />
          </div>
        </>
      )}

      {others.length > 0 && <div className="list-header">{plan ? 'Other routines' : 'Your routines'}</div>}
      {others.length > 0 && (
        <div className="list with-icons" style={{ marginBottom: 20 }}>
          {others.map((r) => (
            <RoutineRow key={r.id} routine={r} onStart={onStart} />
          ))}
        </div>
      )}

      <div className="list with-icons">
        <button className="list-item" onClick={() => onStart()}>
          <span className="tile m-cardio">
            <Plus size={21} strokeWidth={2.5} />
          </span>
          <span className="grow">
            <span className="title" style={{ display: 'block' }}>
              Empty workout
            </span>
            <span className="sub">Add exercises as you go</span>
          </span>
        </button>
        <button
          className="list-item"
          onClick={() => {
            onClose();
            createRoutine();
          }}
        >
          <span className="tile">
            <ClipboardList size={20} />
          </span>
          <span className="grow">
            <span className="title" style={{ display: 'block' }}>
              Build a routine
            </span>
            <span className="sub">Save a workout you can repeat</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}

function RoutineRow({ routine, onStart }: { routine: Routine; onStart: (routineId?: string) => void }) {
  const tile = useRoutineTile();
  const empty = !routine.exercises.length;
  return (
    <button className="list-item" onClick={() => onStart(routine.id)} disabled={empty} style={empty ? { opacity: 0.5 } : undefined}>
      <span className={`tile ${tile(routine)}`}>{routine.name.trim().charAt(0).toUpperCase()}</span>
      <span className="grow">
        <span className="title truncate" style={{ display: 'block' }}>
          {routine.name}
        </span>
        <span className="sub truncate" style={{ display: 'block' }}>
          {empty
            ? 'No exercises yet'
            : `${routine.exercises.length} exercise${routine.exercises.length === 1 ? '' : 's'}${routine.lastUsedAt ? ` · last done ${relativeDayInline(routine.lastUsedAt)}` : ''}`}
        </span>
      </span>
      {!empty && (
        <span className="play-btn" aria-hidden>
          <Play size={15} fill="currentColor" />
        </span>
      )}
    </button>
  );
}
