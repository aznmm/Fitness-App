import { ChevronRight, ClipboardList, Play, Plus } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../components/Dialogs';
import { EmptyState, PageHeader } from '../components/Layout';
import { PlanSheet, weekdayName } from '../components/PlanSheet';
import { useCreateRoutine, useRoutineTile } from '../components/StartWorkoutSheet';
import { Sheet } from '../components/Sheet';
import { muscleClass } from '../data/exercises';
import { PROGRAMS, type Program } from '../data/programs';
import { relativeDayInline } from '../lib/dates';
import { weekdayOf, weeklyRoutineId } from '../lib/plans';
import { uid } from '../lib/id';
import { exerciseName, useExercises, useStore } from '../store/useStore';
import { useStartWorkout } from './Home';

const PROGRAM_TILES = ['m-legs', 'm-back', 'm-chest', 'm-shoulders'];

export function Routines() {
  const routines = useStore((s) => s.routines);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const { byId } = useExercises();
  const start = useStartWorkout();
  const create = useCreateRoutine();
  const [program, setProgram] = useState<Program | null>(null);

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
          <button className="glass-btn accent" onClick={() => create()} aria-label="New routine">
            <Plus size={22} strokeWidth={2.4} />
          </button>
        }
      />

      {routines.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ClipboardList size={30} />} title="No routines yet">
            <p className="small">Routines are reusable workout templates. Build your own or start from a program below.</p>
            <button className="btn btn-tinted" style={{ marginTop: 14 }} onClick={() => create()}>
              <Plus size={18} strokeWidth={2.5} /> New routine
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {routines.map((r) => (
            <div className="card" key={r.id} style={{ margin: 0 }}>
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <Link to={`/routines/${r.id}`} className="grow" style={{ color: 'inherit' }}>
                  <h3 className="truncate" style={{ fontSize: 19 }}>
                    {r.name}
                  </h3>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                    {r.lastUsedAt ? ` · last done ${relativeDayInline(r.lastUsedAt)}` : ''}
                  </div>
                </Link>
                <button className="btn btn-sm btn-primary" onClick={() => start(r.id)} disabled={!r.exercises.length}>
                  <Play size={13} fill="currentColor" /> Start
                </button>
              </div>
              {r.exercises.length > 0 && (
                <Link to={`/routines/${r.id}`} className="stack-sm" style={{ marginTop: 14, gap: 8, color: 'inherit' }}>
                  {r.exercises.slice(0, 5).map((e) => (
                    <div key={e.id} className="row small" style={{ gap: 10 }}>
                      <span className={`dot ${muscleClass(byId.get(e.exerciseId)?.primary)}`} aria-hidden />
                      <span className="grow truncate">{exerciseName(byId, e.exerciseId)}</span>
                      <span className="rounded-num muted">
                        {e.sets} × {e.reps ?? '—'}
                      </span>
                    </div>
                  ))}
                  {r.exercises.length > 5 && <div className="small muted" style={{ paddingLeft: 18 }}>+{r.exercises.length - 5} more</div>}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {routines.length > 0 && <WeeklyPlan />}

      <section className="section">
        <div className="section-head">
          <h2>Programs</h2>
        </div>
        <div className="list with-icons">
          {PROGRAMS.map((p, i) => (
            <button className="list-item" key={p.id} onClick={() => setProgram(p)}>
              <div className={`tile solid ${PROGRAM_TILES[i % PROGRAM_TILES.length]}`}>
                <span className="rounded-num">{p.days.length}</span>
              </div>
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="sub truncate">
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
            <button className="btn btn-primary btn-lg btn-block" onClick={() => addProgram(program)}>
              <Plus size={19} strokeWidth={2.5} /> Add {program.days.length} routines
            </button>
          }
        >
          <p className="secondary" style={{ marginTop: 0 }}>
            {program.description}
          </p>
          <span className="badge accent" style={{ marginBottom: 14 }}>
            {program.daysPerWeek} per week
          </span>
          {program.days.map((d) => (
            <div className="card tight" key={d.name}>
              <h3 style={{ marginBottom: 10 }}>{d.name}</h3>
              <div className="stack-sm" style={{ gap: 8 }}>
                {d.exercises.map((e) => (
                  <div className="row small" key={e.exerciseId} style={{ gap: 10 }}>
                    <span className={`dot ${muscleClass(byId.get(e.exerciseId)?.primary)}`} aria-hidden />
                    <span className="grow">{exerciseName(byId, e.exerciseId)}</span>
                    <span className="rounded-num muted">
                      {e.sets} × {e.reps ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}

/** The repeating weekly schedule: one routine (or rest) per weekday. */
function WeeklyPlan() {
  const plans = useStore((s) => s.plans);
  const routines = useStore((s) => s.routines);
  const tile = useRoutineTile();
  const [editing, setEditing] = useState<number | null>(null);
  const today = weekdayOf(Date.now());

  return (
    <section className="section">
      <div className="section-head">
        <h2>Weekly plan</h2>
        <span className="small muted">Repeats every week</span>
      </div>
      <div className="list with-icons">
        {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
          const id = weeklyRoutineId(plans, wd);
          const routine = routines.find((r) => r.id === id);
          return (
            <button className="list-item" key={wd} onClick={() => setEditing(wd)} style={{ minHeight: 52 }}>
              <span
                className={`tile sm${routine ? ` solid ${tile(routine)}` : ''}`}
                style={{ width: 40, fontSize: 12, ...(routine ? {} : ({ '--tile': 'var(--text-2)' } as CSSProperties)) }}
              >
                {weekdayName(wd, 'short')}
              </span>
              <span className="grow">
                <span className={`title truncate${routine ? '' : ' muted'}`} style={{ display: 'block' }}>
                  {routine?.name ?? 'Rest'}
                </span>
                {wd === today && <span className="sub">Today</span>}
              </span>
              <ChevronRight size={18} className="chev" />
            </button>
          );
        })}
      </div>
      <div className="list-footer">Planned days show on Home, ready to start with one tap. Change a single day from the week on Home.</div>
      {editing !== null && <PlanSheet target={{ weekday: editing }} onClose={() => setEditing(null)} />}
    </section>
  );
}
