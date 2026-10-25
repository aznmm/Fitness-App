import { ChevronRight, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomExerciseSheet } from '../components/CustomExerciseSheet';
import { ExerciseInitial, filterExercises } from '../components/ExercisePicker';
import { PageHeader } from '../components/Layout';
import { EQUIPMENT_LABELS, MUSCLE_FILTERS, MUSCLE_LABELS } from '../data/exercises';
import { relativeDayInline } from '../lib/dates';
import { exerciseUsage } from '../lib/stats';
import { useExercises, useStore } from '../store/useStore';

export function Exercises() {
  const { list } = useExercises();
  const workouts = useStore((s) => s.workouts);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sort, setSort] = useState<'name' | 'used'>('name');
  const [creating, setCreating] = useState(false);

  const usage = useMemo(() => exerciseUsage(workouts), [workouts]);
  const filtered = useMemo(() => {
    const out = filterExercises(list, query, muscle);
    if (sort === 'used') out.sort((a, b) => (usage.get(b.id)?.count ?? 0) - (usage.get(a.id)?.count ?? 0) || a.name.localeCompare(b.name));
    return out;
  }, [list, query, muscle, sort, usage]);

  return (
    <div className="page">
      <PageHeader
        title="Exercises"
        actions={
          <button className="glass-btn accent" onClick={() => setCreating(true)} aria-label="New custom exercise">
            <Plus size={22} strokeWidth={2.4} />
          </button>
        }
      />
      <div className="stack" style={{ marginBottom: 16, marginTop: -6 }}>
        <label className="search">
          <Search size={18} />
          <input className="input" placeholder={`Search ${list.length} exercises`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search exercises" />
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
        <div className="seg" role="group" aria-label="Sort">
          <button aria-pressed={sort === 'name'} onClick={() => setSort('name')}>
            A–Z
          </button>
          <button aria-pressed={sort === 'used'} onClick={() => setSort('used')}>
            Most done
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className="list with-icons">
          {filtered.map((e) => {
            const u = usage.get(e.id);
            return (
              <Link key={e.id} to={`/exercises/${e.id}`} className="list-item">
                <ExerciseInitial exercise={e} />
                <div className="grow">
                  <div className="title truncate">
                    {e.name}
                    {e.custom && <span className="badge accent" style={{ marginLeft: 8 }}>Custom</span>}
                  </div>
                  <div className="sub truncate">
                    {MUSCLE_LABELS[e.primary]} · {EQUIPMENT_LABELS[e.equipment]}
                    {u ? ` · ${u.count}× · ${relativeDayInline(u.last)}` : ''}
                  </div>
                </div>
                <ChevronRight size={18} className="chev" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <p>No exercises match.</p>
          <button className="btn btn-tinted" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create custom exercise
          </button>
        </div>
      )}

      {creating && <CustomExerciseSheet initialName={query} onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
    </div>
  );
}
