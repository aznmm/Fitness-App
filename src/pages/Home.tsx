import { Dumbbell, Flame, Play, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/Dialogs';
import { EmptyState, PageHeader } from '../components/Layout';
import { StrengthScoreCard } from '../components/StrengthScoreCard';
import { WorkoutCard } from '../components/WorkoutCard';
import { addDays, formatDate, greeting, sameDay, startOfWeek } from '../lib/dates';
import { finished, weekStreak, weeklyStats } from '../lib/stats';
import { formatVolume } from '../lib/units';
import { exerciseName, useExercises, useStore } from '../store/useStore';
import type { Routine } from '../types';

/** Starts a workout, confirming first if one is already running. */
export function useStartWorkout() {
  const navigate = useNavigate();
  const active = useStore((s) => s.active);
  const startWorkout = useStore((s) => s.startWorkout);
  return async (routineId?: string, template?: Routine) => {
    if (active) {
      const ok = await confirm({
        title: 'Workout in progress',
        message: `“${active.name}” is still running. Discard it and start a new one?`,
        confirmLabel: 'Start new',
        cancelLabel: 'Keep current',
        danger: true,
      });
      if (!ok) {
        navigate('/workout');
        return;
      }
    }
    startWorkout({ routineId, template, name: template?.name });
    navigate('/workout');
  };
}

export function Home() {
  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const { byId } = useExercises();
  const start = useStartWorkout();

  const done = useMemo(() => finished(workouts), [workouts]);
  const thisWeek = useMemo(() => weeklyStats(workouts, 1)[0], [workouts]);
  const streak = useMemo(() => weekStreak(workouts), [workouts]);
  const weekStart = startOfWeek(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const quickRoutines = [...routines].sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt)).slice(0, 6);

  return (
    <div className="page">
      <PageHeader
        eyebrow={formatDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })}
        title={greeting()}
        actions={
          <Link to="/settings" className="icon-btn filled" aria-label="Settings">
            <SettingsIcon size={20} />
          </Link>
        }
      />

      <StrengthScoreCard />

      <div className="card">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h3>This week</h3>
          {streak > 0 && (
            <span className="badge gold">
              <Flame size={12} /> {streak} week streak
            </span>
          )}
        </div>
        <div className="week-strip">
          {days.map((d) => {
            const trained = done.some((w) => sameDay(w.startedAt, d));
            return (
              <div className="day" key={d}>
                {formatDate(d, { weekday: 'narrow' })}
                <div className={`dot${trained ? ' on' : ''}${sameDay(d, Date.now()) ? ' today' : ''}`}>{new Date(d).getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div>
            <div className="small muted">Workouts</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {thisWeek.workouts}
              <span className="muted small"> / {settings.weeklyGoal}</span>
            </div>
          </div>
          <div>
            <div className="small muted">Sets</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{thisWeek.sets}</div>
          </div>
          <div>
            <div className="small muted">Volume</div>
            <div style={{ fontWeight: 700, fontSize: 18 }} className="truncate">
              {formatVolume(thisWeek.volume, settings.unit, true)}
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        {active ? (
          <Link to="/workout" className="btn btn-primary btn-lg btn-block">
            <Play size={20} fill="currentColor" /> Resume {active.name}
          </Link>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => start()}>
            <Plus size={22} /> Start empty workout
          </button>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Routines</h2>
          <Link to="/routines" className="small" style={{ fontWeight: 600 }}>
            See all
          </Link>
        </div>
        {quickRoutines.length ? (
          <div className="chips" style={{ gap: 10 }}>
            {quickRoutines.map((r) => (
              <button key={r.id} className="card" style={{ flex: 'none', width: 200, textAlign: 'left', margin: 0 }} onClick={() => start(r.id)}>
                <div className="spread">
                  <h3 className="truncate">{r.name}</h3>
                  <Play size={16} className="muted" />
                </div>
                <div className="small muted truncate" style={{ marginTop: 4 }}>
                  {r.exercises.map((e) => exerciseName(byId, e.exerciseId)).join(', ') || 'No exercises'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Link to="/routines" className="card link">
            <div className="row">
              <div className="avatar accent">
                <Plus size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 650 }}>Create a routine</div>
                <div className="small muted">Or pick a ready-made program</div>
              </div>
            </div>
          </Link>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent workouts</h2>
          {done.length > 3 && (
            <Link to="/history" className="small" style={{ fontWeight: 600 }}>
              See all
            </Link>
          )}
        </div>
        {done.length ? (
          done.slice(0, 3).map((w) => <WorkoutCard key={w.id} workout={w} />)
        ) : (
          <div className="card">
            <EmptyState icon={<Dumbbell size={36} />} title="No workouts yet">
              <p className="small">Start a workout and log your first sets — your history and progress will show up here.</p>
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
