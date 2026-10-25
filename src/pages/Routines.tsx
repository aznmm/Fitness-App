import { ChevronRight, ClipboardList, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../components/Dialogs';
import { EmptyState, PageHeader } from '../components/Layout';
import { Sheet } from '../components/Sheet';
import { PROGRAMS, type Program } from '../data/programs';
import { relativeDayInline } from '../lib/dates';
import { uid } from '../lib/id';
import { exerciseName, useExercises, useStore } from '../store/useStore';
import { useStartWorkout } from './Home';

export function Routines() {
  const routines = useStore((s) => s.routines);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const { byId } = useExercises();
  const navigate = useNavigate();
  const start = useStartWorkout();
  const [program, setProgram] = useState<Program | null>(null);

  const create = () => {
    const id = uid();
    saveRoutine({ id, name: 'New routine', exercises: [], createdAt: Date.now() });
    navigate(`/routines/${id}?new=1`);
  };

  const addProgram = (p: Program) => {
    const now = Date.now();
    p.days.forEach((d, i) =>
      saveRoutine({
        id: uid(),
        name: d.name,
        notes: i === 0 ? p.description : undefined,
        createdAt: now + i,
        exercises: d.exercises.map((e) => ({ id: uid(), ...e })),
      }),
    );
    setProgram(null);
    toast(`Added ${p.days.length} routine${p.days.length > 1 ? 's' : ''} from ${p.name}`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Routines"
        actions={
          <button className="btn btn-sm btn-primary" onClick={create}>
            <Plus size={16} /> New
          </button>
        }
      />

      {routines.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ClipboardList size={36} />} title="No routines yet">
            <p className="small">Routines are reusable workout templates. Build your own or start from a program below.</p>
          </EmptyState>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {routines.map((r) => (
            <div className="card" key={r.id} style={{ margin: 0 }}>
              <div className="spread">
                <Link to={`/routines/${r.id}`} className="grow" style={{ color: 'inherit' }}>
                  <h3 className="truncate">{r.name}</h3>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                    {r.lastUsedAt ? ` · last done ${relativeDayInline(r.lastUsedAt)}` : ''}
                  </div>
                </Link>
                <button className="btn btn-sm btn-primary" onClick={() => start(r.id)} disabled={!r.exercises.length}>
                  <Play size={14} fill="currentColor" /> Start
                </button>
              </div>
              {r.exercises.length > 0 && (
                <div className="small secondary" style={{ marginTop: 10, lineHeight: 1.6 }}>
                  {r.exercises.map((e) => `${e.sets}× ${exerciseName(byId, e.exerciseId)}`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Programs</h2>
          <span className="small muted">Tap to preview</span>
        </div>
        <div className="list">
          {PROGRAMS.map((p) => (
            <button className="list-item" key={p.id} onClick={() => setProgram(p)}>
              <div className="avatar accent">{p.days.length}</div>
              <div className="grow">
                <div style={{ fontWeight: 650 }}>{p.name}</div>
                <div className="small muted truncate">
                  {p.daysPerWeek} · {p.description}
                </div>
              </div>
              <ChevronRight size={18} className="chev" />
            </button>
          ))}
        </div>
      </section>

      {program && (
        <Sheet
          title={program.name}
          onClose={() => setProgram(null)}
          footer={
            <button className="btn btn-primary btn-block" onClick={() => addProgram(program)}>
              <Plus size={18} /> Add {program.days.length} routines
            </button>
          }
        >
          <p className="secondary" style={{ marginTop: 0 }}>
            {program.description} <span className="muted">({program.daysPerWeek} per week)</span>
          </p>
          {program.days.map((d) => (
            <div className="card tight" key={d.name}>
              <h3 style={{ marginBottom: 6 }}>{d.name}</h3>
              {d.exercises.map((e) => (
                <div className="spread small secondary" key={e.exerciseId} style={{ padding: '3px 0' }}>
                  <span>{exerciseName(byId, e.exerciseId)}</span>
                  <span className="tabular muted">
                    {e.sets} × {e.reps ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}
