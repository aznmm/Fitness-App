import { CalendarCheck, ClipboardList, Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { muscleClass } from '../data/exercises';
import { useMemo } from 'react';
import { shortDay } from '../lib/dates';
import { uid } from '../lib/id';
import type { DayPlan } from '../lib/plans';
import { lastDone } from '../lib/stats';
import { useExercises, useStore } from '../store/useStore';
import type { Exercise, Routine } from '../types';
import { ExerciseIcon } from './MuscleIcon';
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

/** A routine's focus: an exercise from the muscle it trains most (by sets), for its tile. */
export function useRoutineFocus() {
  const { byId } = useExercises();
  return (r: Routine): Exercise | undefined => {
    const sets = new Map<string, number>();
    let focus: Exercise | undefined;
    for (const re of r.exercises) {
      const ex = byId.get(re.exerciseId);
      if (!ex) continue;
      const n = (sets.get(ex.primary) ?? 0) + re.sets;
      sets.set(ex.primary, n);
      if (!focus || n > (sets.get(focus.primary) ?? 0)) focus = ex;
    }
    return focus;
  };
}

/** Tile colour class for a routine. */
export function useRoutineTile() {
  const focusOf = useRoutineFocus();
  return (r: Routine) => muscleClass(focusOf(r)?.primary) || 'm-cardio';
}

/** A routine's tile: its main muscle group, coloured like that group. */
export function RoutineTile({ routine }: { routine: Routine }) {
  const focus = useRoutineFocus()(routine);
  return (
    <span className={`tile ${muscleClass(focus?.primary) || 'm-cardio'}`} aria-hidden>
      {focus ? <ExerciseIcon exercise={{ ...focus, secondary: [] }} size={32} /> : <ClipboardList size={19} />}
    </span>
  );
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
  const workouts = useStore((s) => s.workouts);
  const done = useMemo(() => lastDone(workouts, routines), [workouts, routines]);
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
            <RoutineRow routine={plan.routine} last={done.get(plan.routine.id)} onStart={onStart} />
          </div>
        </>
      )}

      {others.length > 0 && <div className="list-header">{plan ? 'Other routines' : 'Your routines'}</div>}
      {others.length > 0 && (
        <div className="list with-icons" style={{ marginBottom: 20 }}>
          {others.map((r) => (
            <RoutineRow key={r.id} routine={r} last={done.get(r.id)} onStart={onStart} />
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

function RoutineRow({ routine, last, onStart }: { routine: Routine; last?: number; onStart: (routineId?: string) => void }) {
  const empty = !routine.exercises.length;
  return (
    <button className="list-item" onClick={() => onStart(routine.id)} disabled={empty} style={empty ? { opacity: 0.5 } : undefined}>
      <RoutineTile routine={routine} />
      <span className="grow">
        <span className="title truncate" style={{ display: 'block' }}>
          {routine.name}
        </span>
        <span className="sub truncate" style={{ display: 'block' }}>
          {empty
            ? 'No exercises yet'
            : `${routine.exercises.length} exercise${routine.exercises.length === 1 ? '' : 's'}${last ? ` · last done ${shortDay(last)}` : ''}`}
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
