import { Check, ChevronRight, Dumbbell, Flame, Play, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/Dialogs';
import { EmptyState, PageHeader } from '../components/Layout';
import { StrengthScoreCard } from '../components/StrengthScoreCard';
import { WorkoutCard } from '../components/WorkoutCard';
import { muscleClass } from '../data/exercises';
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
          <Link to="/settings" className="glass-btn" aria-label="Settings">
            <SettingsIcon size={20} />
          </Link>
        }
      />

      <StrengthScoreCard />

      <div className="card">
        <div className="spread" style={{ marginBottom: 14 }}>
          <div className="card-title">This week</div>
          {streak > 0 && (
            <span className="badge gold">
              <Flame size={13} /> {streak}-week streak
            </span>
          )}
        </div>
        <div className="week-strip">
          {days.map((d) => {
            const trained = done.some((w) => sameDay(w.startedAt, d));
            return (
              <div className="day" key={d}>
                {formatDate(d, { weekday: 'narrow' })}
                <div className={`bubble${trained ? ' on' : ''}${sameDay(d, Date.now()) ? ' today' : ''}`}>
                  {trained ? <Check size={17} strokeWidth={3} aria-label="Workout logged" /> : new Date(d).getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <div className="metrics">
          <div className="metric">
            <div className="label">Workouts</div>
            <div className="value">
              {thisWeek.workouts}
              <small>/{settings.weeklyGoal}</small>
            </div>
          </div>
          <div className="metric">
            <div className="label">Sets</div>
            <div className="value">{thisWeek.sets}</div>
          </div>
          <div className="metric">
            <div className="label">Volume</div>
            <div className="value">
              {formatVolume(thisWeek.volume, settings.unit, true).replace(` ${settings.unit}`, '')}
              <small>{settings.unit}</small>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        {active ? (
          <Link to="/workout" className="btn btn-hero btn-lg btn-block">
            <Play size={20} fill="currentColor" /> Resume {active.name}
          </Link>
        ) : (
          <button className="btn btn-hero btn-lg btn-block" onClick={() => start()}>
            <Plus size={22} strokeWidth={2.5} /> Start workout
          </button>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Routines</h2>
          <Link to="/routines">See all</Link>
        </div>
        {quickRoutines.length ? (
          <div className="chips" style={{ gap: 12 }}>
            {quickRoutines.map((r) => {
              const groups = [...new Set(r.exercises.map((e) => muscleClass(byId.get(e.exerciseId)?.primary)))].filter(Boolean);
              return (
                <button key={r.id} className="card routine-card" onClick={() => start(r.id)} aria-label={`Start ${r.name}`}>
                  <div className="spread">
                    <div className="muscle-dots" aria-hidden>
                      {groups.slice(0, 5).map((g) => (
                        <span key={g} className={`dot ${g}`} />
                      ))}
                    </div>
                    <span className="play-btn" aria-hidden>
                      <Play size={15} fill="currentColor" />
                    </span>
                  </div>
                  <h3 className="truncate" style={{ marginTop: 10 }}>
                    {r.name}
                  </h3>
                  <div className="small muted truncate" style={{ marginTop: 2 }}>
                    {r.exercises.map((e) => exerciseName(byId, e.exerciseId)).join(', ') || 'No exercises'}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <Link to="/routines" className="card link">
            <div className="row" style={{ gap: 14 }}>
              <div className="tile">
                <Plus size={22} />
              </div>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>Create a routine</div>
                <div className="small muted">Or pick a ready-made program</div>
              </div>
              <ChevronRight size={20} className="faint" />
            </div>
          </Link>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent</h2>
          {done.length > 3 && <Link to="/history">See all</Link>}
        </div>
        {done.length ? (
          done.slice(0, 3).map((w) => <WorkoutCard key={w.id} workout={w} />)
        ) : (
          <div className="card">
            <EmptyState icon={<Dumbbell size={30} />} title="No workouts yet">
              <p className="small">Start a workout and log your first sets — your history and progress will show up here.</p>
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
