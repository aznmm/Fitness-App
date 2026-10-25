import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EQUIPMENT_LABELS, MUSCLE_FILTERS, MUSCLE_LABELS, muscleClass } from '../data/exercises';
import { exerciseUsage } from '../lib/stats';
import { useExercises, useStore } from '../store/useStore';
import type { Exercise } from '../types';
import { CustomExerciseSheet } from './CustomExerciseSheet';
import { Sheet } from './Sheet';

export function filterExercises(list: Exercise[], query: string, muscleFilter: string | null): Exercise[] {
  const q = query.trim().toLowerCase();
  const muscles = MUSCLE_FILTERS.find((f) => f.id === muscleFilter)?.muscles;
  return list.filter((e) => {
    if (muscles && !muscles.includes(e.primary)) return false;
    if (!q) return true;
    const hay = `${e.name} ${MUSCLE_LABELS[e.primary]} ${EQUIPMENT_LABELS[e.equipment]}`.toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

/** Muscle-coloured tile with the exercise's initial (or a check when selected). */
export function ExerciseInitial({ exercise, selected, small }: { exercise?: Exercise; selected?: boolean; small?: boolean }) {
  return (
    <div className={`tile ${muscleClass(exercise?.primary)}${selected ? ' selected' : ''}${small ? ' sm' : ''}`} aria-hidden>
      {selected ? <Check size={small ? 16 : 20} strokeWidth={3} /> : (exercise?.name.charAt(0) ?? '?')}
    </div>
  );
}

interface PickerProps {
  title?: string;
  multi?: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
}

/** Search + filter the library. Recently used exercises float to the top. */
export function ExercisePicker({ title = 'Add exercises', multi = true, onClose, onPick }: PickerProps) {
  const { list } = useExercises();
  const workouts = useStore((s) => s.workouts);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const usage = useMemo(() => exerciseUsage(workouts), [workouts]);
  const filtered = useMemo(() => filterExercises(list, query, muscle), [list, query, muscle]);
  const recent = useMemo(
    () =>
      query || muscle
        ? []
        : [...usage.entries()]
            .sort((a, b) => b[1].last - a[1].last)
            .slice(0, 5)
            .map(([id]) => list.find((e) => e.id === id))
            .filter((e): e is Exercise => !!e),
    [usage, list, query, muscle],
  );

  const toggle = (id: string) => {
    if (!multi) {
      onPick([id]);
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const row = (e: Exercise) => (
    <button key={e.id} className="list-item" onClick={() => toggle(e.id)} aria-pressed={selected.includes(e.id)}>
      <ExerciseInitial exercise={e} selected={selected.includes(e.id)} />
      <div className="grow">
        <div className="title truncate">{e.name}</div>
        <div className="sub">
          {MUSCLE_LABELS[e.primary]} · {EQUIPMENT_LABELS[e.equipment]}
          {usage.get(e.id) ? ` · ${usage.get(e.id)!.count}×` : ''}
        </div>
      </div>
    </button>
  );

  return (
    <>
      <Sheet
        title={title}
        onClose={onClose}
        full
        headerExtra={
          <button className="btn btn-sm btn-ghost" onClick={() => setCreating(true)}>
            <Plus size={17} strokeWidth={2.5} /> New
          </button>
        }
        footer={
          multi && (
            <button className="btn btn-primary btn-lg btn-block" disabled={!selected.length} onClick={() => onPick(selected)}>
              {selected.length ? `Add ${selected.length} exercise${selected.length > 1 ? 's' : ''}` : 'Select exercises'}
            </button>
          )
        }
      >
        <div className="stack" style={{ position: 'sticky', top: -4, background: 'var(--surface)', paddingBottom: 10, zIndex: 1 }}>
          <label className="search">
            <Search size={18} />
            <input
              className="input"
              placeholder="Search exercises"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search exercises"
            />
          </label>
          <div className="chips">
            <button className="chip" aria-pressed={muscle === null} onClick={() => setMuscle(null)}>
              All
            </button>
            {MUSCLE_FILTERS.map((f) => (
              <button key={f.id} className="chip" aria-pressed={muscle === f.id} onClick={() => setMuscle(muscle === f.id ? null : f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {recent.length > 0 && (
          <>
            <div className="list-header" style={{ marginTop: 6 }}>Recent</div>
            <div className="list with-icons" style={{ marginBottom: 22 }}>
              {recent.map(row)}
            </div>
            <div className="list-header">All exercises</div>
          </>
        )}
        {filtered.length ? (
          <div className="list with-icons">{filtered.map(row)}</div>
        ) : (
          <div className="empty">
            <p>No exercises match.</p>
            <button className="btn btn-tinted" onClick={() => setCreating(true)}>
              <Plus size={16} /> Create “{query || 'custom exercise'}”
            </button>
          </div>
        )}
      </Sheet>
      {creating && (
        <CustomExerciseSheet
          initialName={query}
          onClose={() => setCreating(false)}
          onSaved={(e) => {
            setCreating(false);
            setQuery('');
            if (multi) setSelected((s) => [...s, e.id]);
            else onPick([e.id]);
          }}
        />
      )}
    </>
  );
}
