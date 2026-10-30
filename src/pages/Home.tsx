import { ChevronRight, CircleCheck, Clock, Dumbbell, Play, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BodyMap } from '../components/BodyMap';
import { confirm } from '../components/Dialogs';
import { EmptyState, PageHeader, resumeButtonRef } from '../components/Layout';
import { PlanSheet } from '../components/PlanSheet';
import { StartWorkoutSheet } from '../components/StartWorkoutSheet';
import { StepsCard } from '../components/Steps';
import { StrengthScoreCard } from '../components/StrengthScoreCard';
import { WeekPlanner } from '../components/WeekPlanner';
import { WorkoutCard } from '../components/WorkoutCard';
import { muscleClass } from '../data/exercises';
import { formatDate, greeting, sameDay } from '../lib/dates';
import { groupFatigue, muscleFatigue } from '../lib/muscles';
import { planFor } from '../lib/plans';
import { finished } from '../lib/stats';
import { formatDuration } from '../lib/units';
import { useNow } from '../lib/useNow';
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
  const plans = useStore((s) => s.plans);
  const active = useStore((s) => s.active);
  const rest = useStore((s) => s.rest);
  const clock = useNow(1000, !!rest);
  const restLeft = rest ? Math.ceil((rest.endsAt - clock) / 1000) : 0;
  const { byId } = useExercises();
  const start = useStartWorkout();
  const [picker, setPicker] = useState(false);
  const [planDay, setPlanDay] = useState<number | null>(null);

  const done = useMemo(() => finished(workouts), [workouts]);
  const now = Date.now();
  const todayPlan = planFor(plans, routines, now, now);
  const todayDone = !!todayPlan && done.some((w) => sameDay(w.startedAt, now) && w.routineId === todayPlan.routine.id);
  const upNext = todayPlan && !todayDone && todayPlan.routine.exercises.length ? todayPlan.routine : null;
  const trainedToday = done.some((w) => sameDay(w.startedAt, now));
  // Shown in the bar once the greeting scrolls away.
  const todayStatus = active
    ? `${active.name} in progress`
    : todayPlan
      ? `${todayPlan.routine.name} ${todayDone ? 'done ✓' : 'today'}`
      : trainedToday
        ? 'Workout done ✓'
        : plans.some((p) => p.routineId)
          ? 'Rest day'
          : 'Nothing planned';
  const quickRoutines = [...routines].sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt)).slice(0, 6);

  return (
    <div className="page">
      <PageHeader
        eyebrow={greeting()}
        title={formatDate(now, { weekday: 'long', month: 'short', day: 'numeric' })}
        backTitle="Home"
        navTitle={
          <span className="nav-stack">
            <span>{formatDate(now, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="nav-sub truncate">{todayStatus}</span>
          </span>
        }
        actions={
          <Link to="/settings" className="glass-btn" aria-label="Settings">
            <SettingsIcon size={20} />
          </Link>
        }
      />

      <WeekPlanner onPlan={setPlanDay} />

      <section className="section" style={{ marginTop: 20 }}>
        {active ? (
          <Link to="/workout" className="btn btn-hero btn-lg btn-block" ref={resumeButtonRef}>
            <Play size={20} fill="currentColor" /> <span className="truncate">Resume {active.name}</span>
            {restLeft > 0 && <span className="hero-rest rounded-num">Rest {formatDuration(restLeft)}</span>}
          </Link>
        ) : upNext ? (
          <>
            <button className="btn btn-hero btn-lg btn-block" onClick={() => start(upNext.id)}>
              <Play size={20} fill="currentColor" /> <span className="truncate">Start {upNext.name}</span>
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 6 }} onClick={() => setPicker(true)}>
              Choose a different workout
            </button>
          </>
        ) : (
          <button className="btn btn-hero btn-lg btn-block" onClick={() => setPicker(true)}>
            <Plus size={22} strokeWidth={2.5} /> Start workout
          </button>
        )}
      </section>

      <div className="section" style={{ marginTop: 20 }}>
        <StepsCard />
        <StrengthScoreCard />
        <RecoveryCard />
      </div>

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
          {done.length > 3 && <Link to="/progress?view=history">See all</Link>}
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

      {picker && (
        <StartWorkoutSheet
          plan={todayDone ? null : todayPlan}
          onClose={() => setPicker(false)}
          onStart={(id) => {
            setPicker(false);
            void start(id);
          }}
        />
      )}
      {planDay !== null && <PlanSheet target={{ date: planDay }} onClose={() => setPlanDay(null)} />}
    </div>
  );
}

/** Body map of what's still recovering, with ready-to-train groups listed. */
function RecoveryCard() {
  const workouts = useStore((s) => s.workouts);
  const { byId } = useExercises();
  const fatigue = useMemo(() => muscleFatigue(workouts, byId), [workouts, byId]);
  if (!workouts.some((w) => w.endedAt)) return null;
  const groups = groupFatigue(fatigue);
  const ready = groups.filter((g) => g.status === 'fresh');
  const recovering = groups.filter((g) => g.status !== 'fresh');

  return (
    <Link to="/progress" className="card link">
      <div className="spread">
        <div className="card-title">Recovery</div>
        <ChevronRight size={20} className="faint" />
      </div>
      <div className="row" style={{ gap: 18, marginTop: 10, alignItems: 'center' }}>
        <BodyMap values={fatigue} height={128} captions={false} label="Muscle recovery" />
        <div className="grow stack" style={{ gap: 12 }}>
          <div>
            <div className="row small" style={{ gap: 5, color: 'var(--green-text)', fontWeight: 600 }}>
              <CircleCheck size={15} /> Ready to train
            </div>
            <div style={{ marginTop: 2, fontWeight: 500 }}>{ready.map((g) => g.label).join(', ') || 'Nothing yet'}</div>
          </div>
          {recovering.length > 0 && (
            <div>
              <div className="row small" style={{ gap: 5, color: 'var(--heat)', fontWeight: 600 }}>
                <Clock size={15} /> Recovering
              </div>
              <div style={{ marginTop: 2, fontWeight: 500 }}>{recovering.map((g) => g.label).join(', ')}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
