import { CalendarDays, ChevronLeft, ChevronRight, History as HistoryIcon, List, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, PageHeader } from '../components/Layout';
import { WorkoutCard } from '../components/WorkoutCard';
import { workoutPRs } from '../lib/calc';
import { addDays, addMonths, formatDate, sameDay, startOfDay, startOfMonth, startOfWeek } from '../lib/dates';
import { uid } from '../lib/id';
import { finished } from '../lib/stats';
import { useBodyweight, useExercises, useStore } from '../store/useStore';

export function History() {
  const workouts = useStore((s) => s.workouts);
  const addWorkout = useStore((s) => s.addWorkout);
  const bodyweight = useBodyweight();
  const { byId } = useExercises();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [day, setDay] = useState<number | null>(null);

  const done = useMemo(() => finished(workouts), [workouts]);
  const prCounts = useMemo(() => new Map(done.map((w) => [w.id, workoutPRs(w, workouts, byId, bodyweight).length])), [done, workouts, byId, bodyweight]);

  const logPast = () => {
    const d = new Date(day ?? Date.now());
    d.setHours(18, 0, 0, 0);
    const startedAt = Math.min(d.getTime(), Date.now() - 3600_000);
    const id = uid();
    addWorkout({ id, name: 'Workout', startedAt, endedAt: startedAt + 3600_000, exercises: [] });
    navigate(`/history/${id}?edit=1`);
  };

  const groups = useMemo(() => {
    const list = day !== null ? done.filter((w) => sameDay(w.startedAt, day)) : done;
    const out: { label: string; items: typeof done }[] = [];
    for (const w of list) {
      const label = formatDate(w.startedAt, { month: 'long', year: 'numeric' });
      if (out[out.length - 1]?.label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(w);
    }
    return out;
  }, [done, day]);

  return (
    <div className="page">
      <PageHeader
        title="History"
        actions={
          <>
            <button
              className="glass-btn"
              aria-label={view === 'list' ? 'Calendar view' : 'List view'}
              onClick={() => {
                setView(view === 'list' ? 'calendar' : 'list');
                setDay(null);
              }}
            >
              {view === 'list' ? <CalendarDays size={20} /> : <List size={20} />}
            </button>
            <button className="glass-btn accent" onClick={logPast} aria-label="Log a past workout">
              <Plus size={22} strokeWidth={2.4} />
            </button>
          </>
        }
      />

      {done.length > 0 && (
        <div className="small muted" style={{ marginTop: -12, marginBottom: 16 }}>
          <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {done.length}
          </span>{' '}
          workout{done.length === 1 ? '' : 's'} logged
        </div>
      )}

      {view === 'calendar' && <MonthCalendar month={month} setMonth={setMonth} workouts={done} day={day} setDay={setDay} />}

      {done.length === 0 ? (
        <EmptyState icon={<HistoryIcon size={30} />} title="No workouts yet">
          <p className="small">Finished workouts show up here. Tap + to backfill an old session.</p>
        </EmptyState>
      ) : groups.length === 0 ? (
        <p className="muted small" style={{ textAlign: 'center', marginTop: 16 }}>
          No workouts on {day !== null && formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="section" style={{ marginTop: 20 }}>
            <div className="list-header" style={{ paddingLeft: 4 }}>
              {g.label} · {g.items.length}
            </div>
            {g.items.map((w) => (
              <WorkoutCard key={w.id} workout={w} prCount={prCounts.get(w.id)} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

interface CalendarProps {
  month: number;
  setMonth: (m: number) => void;
  workouts: { startedAt: number }[];
  day: number | null;
  setDay: (d: number | null) => void;
}

function MonthCalendar({ month, setMonth, workouts, day, setDay }: CalendarProps) {
  const first = startOfWeek(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const trained = new Set(workouts.map((w) => startOfDay(w.startedAt)));
  const inMonth = (d: number) => new Date(d).getMonth() === new Date(month).getMonth();
  const count = workouts.filter((w) => inMonth(w.startedAt) && new Date(w.startedAt).getFullYear() === new Date(month).getFullYear()).length;
  const rows = cells.slice(35).some(inMonth) ? 6 : 5;

  return (
    <div className="card" style={{ marginBottom: 8, padding: '16px 12px 12px' }}>
      <div className="spread" style={{ marginBottom: 10, padding: '0 6px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>{formatDate(month, { month: 'long', year: 'numeric' })}</div>
          <div className="small muted">
            <span className="rounded-num">{count}</span> workout{count === 1 ? '' : 's'}
          </div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" style={{ color: 'var(--accent)' }} aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <button className="icon-btn" style={{ color: 'var(--accent)' }} aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div className="calendar">
        {cells.slice(0, 7).map((d) => (
          <div className="dow" key={`h${d}`}>
            {formatDate(d, { weekday: 'narrow' })}
          </div>
        ))}
        {cells.slice(0, rows * 7).map((d) => {
          const on = trained.has(d);
          const selected = day !== null && sameDay(d, day);
          return (
            <button
              key={d}
              className={`cell${on ? ' on' : ''}${sameDay(d, Date.now()) ? ' today' : ''}${selected ? ' selected' : ''}${inMonth(d) ? '' : ' out'}`}
              onClick={() => setDay(selected ? null : d)}
              aria-label={`${formatDate(d, { month: 'long', day: 'numeric' })}${on ? ', workout logged' : ''}`}
              aria-pressed={selected}
            >
              {new Date(d).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
