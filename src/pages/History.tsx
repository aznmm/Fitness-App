import { ChevronLeft, ChevronRight, History as HistoryIcon, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/Layout';
import { WorkoutCard } from '../components/WorkoutCard';
import { workoutPRs } from '../lib/calc';
import { addDays, addMonths, formatDate, sameDay, startOfDay, startOfMonth, startOfWeek } from '../lib/dates';
import { uid } from '../lib/id';
import { finished } from '../lib/stats';
import { useBodyweight, useExercises, useStore } from '../store/useStore';

/** Backfills a workout on a past day (default today) and opens it for editing. */
export function useLogPastWorkout() {
  const addWorkout = useStore((s) => s.addWorkout);
  const navigate = useNavigate();
  return (day?: number | null) => {
    const d = new Date(day ?? Date.now());
    d.setHours(18, 0, 0, 0);
    const startedAt = Math.min(d.getTime(), Date.now() - 3600_000);
    const id = uid();
    addWorkout({ id, name: 'Workout', startedAt, endedAt: startedAt + 3600_000, exercises: [] });
    navigate(`/history/${id}?edit=1`);
  };
}

/** Every finished workout, as a list or a month calendar. Shown on the Progress tab. */
export function HistoryView() {
  const workouts = useStore((s) => s.workouts);
  const bodyweight = useBodyweight();
  const { byId } = useExercises();
  const logPastWorkout = useLogPastWorkout();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [day, setDay] = useState<number | null>(null);

  const done = useMemo(() => finished(workouts), [workouts]);
  const prCounts = useMemo(() => new Map(done.map((w) => [w.id, workoutPRs(w, workouts, byId, bodyweight).length])), [done, workouts, byId, bodyweight]);

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
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div className="seg" role="group" aria-label="History view" style={{ minWidth: 168 }}>
          <button
            aria-pressed={view === 'list'}
            onClick={() => {
              setView('list');
              setDay(null);
            }}
          >
            List
          </button>
          <button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
            Calendar
          </button>
        </div>
        <button className="btn btn-sm btn-tinted" onClick={() => logPastWorkout(day)}>
          <Plus size={16} strokeWidth={2.6} /> Log past
        </button>
      </div>

      {done.length > 0 && (
        <div className="small muted" style={{ marginBottom: 12, paddingLeft: 4 }}>
          <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {done.length}
          </span>{' '}
          workout{done.length === 1 ? '' : 's'} logged
        </div>
      )}

      {view === 'calendar' && <MonthCalendar month={month} setMonth={setMonth} workouts={done} day={day} setDay={setDay} />}

      {done.length === 0 ? (
        <EmptyState icon={<HistoryIcon size={30} />} title="No workouts yet">
          <p className="small">Finished workouts show up here. Tap Log past to backfill an old session.</p>
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
