import { CalendarPlus, Check, ChevronLeft, ChevronRight, Flame, Footprints, Pencil, Plus, Repeat } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { workoutDurationMs, workoutSetCount } from '../lib/calc';
import { addDays, DAY_MS, formatDate, relativeDay, sameDay, startOfDay, startOfWeek } from '../lib/dates';
import { planFor } from '../lib/plans';
import { finished, weekStreak, weeklyStats } from '../lib/stats';
import { stepsOn } from '../lib/steps';
import { formatElapsed, formatVolume } from '../lib/units';
import { useLogPastWorkout } from '../pages/History';
import { useStore } from '../store/useStore';
import type { Routine } from '../types';
import { formatSteps } from './Steps';

interface Props {
  /** Open the plan sheet for a day. */
  onPlan: (date: number) => void;
}

function weekLabel(weekStart: number, now: number): string {
  const diff = Math.round((weekStart - startOfWeek(now)) / (7 * DAY_MS));
  if (diff === 0) return 'This week';
  if (diff === -1) return 'Last week';
  if (diff === 1) return 'Next week';
  const end = addDays(weekStart, 6);
  const sameMonth = new Date(weekStart).getMonth() === new Date(end).getMonth();
  return `${formatDate(weekStart)} – ${sameMonth ? new Date(end).getDate() : formatDate(end)}`;
}

/** Day title: "Today", "Tomorrow", "Yesterday" or "Wednesday, Oct 29". */
function dayTitle(t: number, now: number): string {
  if (sameDay(t, addDays(now, 1))) return 'Tomorrow';
  const rel = relativeDay(t, now);
  return rel === 'Today' || rel === 'Yesterday' ? rel : formatDate(t, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Home's week card: browse weeks, tap a day to see what was done or is planned. */
export function WeekPlanner({ onPlan }: Props) {
  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const plans = useStore((s) => s.plans);
  const settings = useStore((s) => s.settings);
  const now = Date.now();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now));
  const [selected, setSelected] = useState(() => startOfDay(now));
  const touch = useRef<{ x: number; y: number } | null>(null);

  const done = useMemo(() => finished(workouts), [workouts]);
  const week = useMemo(() => weeklyStats(workouts, 1, weekStart)[0], [workouts, weekStart]);
  const streak = useMemo(() => weekStreak(workouts), [workouts]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isThisWeek = weekStart === startOfWeek(now);
  const atToday = isThisWeek && sameDay(selected, now);

  const shift = (weeks: number) => {
    setWeekStart(addDays(weekStart, 7 * weeks));
    setSelected(addDays(selected, 7 * weeks));
  };
  const goToday = () => {
    setWeekStart(startOfWeek(now));
    setSelected(startOfDay(now));
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <div className="card-title truncate">{weekLabel(weekStart, now)}</div>
          {atToday && streak > 0 && (
            <span className="badge gold">
              <Flame size={13} /> {streak}-week streak
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 0, marginRight: -8 }}>
          {!atToday && (
            <button className="btn btn-sm btn-tinted" style={{ marginRight: 4 }} onClick={goToday}>
              Today
            </button>
          )}
          <button className="icon-btn" style={{ color: 'var(--accent)' }} aria-label="Previous week" onClick={() => shift(-1)}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <button className="icon-btn" style={{ color: 'var(--accent)' }} aria-label="Next week" onClick={() => shift(1)}>
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div
        className="week-strip"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
        }}
      >
        {days.map((d) => {
          const trained = done.some((w) => sameDay(w.startedAt, d));
          const planned = !trained && !!planFor(plans, routines, d, now);
          const isSelected = sameDay(d, selected);
          const isToday = sameDay(d, now);
          return (
            <button
              className="day"
              key={d}
              onClick={() => setSelected(d)}
              aria-pressed={isSelected}
              aria-label={`${formatDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}${trained ? ', workout logged' : planned ? ', workout planned' : ''}`}
            >
              {formatDate(d, { weekday: 'narrow' })}
              <span className={`bubble${trained ? ' on' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}>
                {trained ? <Check size={17} strokeWidth={3} /> : new Date(d).getDate()}
              </span>
              <span className={`plan-dot${planned ? ' on' : ''}`} />
            </button>
          );
        })}
      </div>

      <DayDetail day={selected} now={now} onPlan={onPlan} />

      <div className="divider" />
      <div className="metrics">
        <div className="metric">
          <div className="label">Workouts</div>
          <div className="value">
            {week.workouts}
            <small>/{settings.weeklyGoal}</small>
          </div>
        </div>
        <div className="metric">
          <div className="label">Sets</div>
          <div className="value">{week.sets}</div>
        </div>
        <div className="metric">
          <div className="label">Volume</div>
          <div className="value">
            {formatVolume(week.volume, settings.unit, true).replace(` ${settings.unit}`, '')}
            <small>{settings.unit}</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDetail({ day, now, onPlan }: { day: number; now: number } & Props) {
  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const plans = useStore((s) => s.plans);
  const steps = useStore((s) => s.steps);
  const logPastWorkout = useLogPastWorkout();

  const dayWorkouts = useMemo(() => finished(workouts).filter((w) => sameDay(w.startedAt, day)).reverse(), [workouts, day]);
  const plan = planFor(plans, routines, day, now);
  const planDone = !!plan && dayWorkouts.some((w) => w.routineId === plan.routine.id);
  const isToday = sameDay(day, now);
  const isPast = startOfDay(day) < startOfDay(now);
  const stepCount = stepsOn(steps, day);

  return (
    <div className="day-detail">
      <div className="spread">
        <div className="day-title">{dayTitle(day, now)}</div>
        {stepCount !== undefined && (
          <span className="row small muted" style={{ gap: 4 }}>
            <Footprints size={14} /> <span className="rounded-num">{formatSteps(stepCount)}</span>
          </span>
        )}
      </div>

      {dayWorkouts.map((w) => (
        <Link key={w.id} to={`/history/${w.id}`} className="day-row">
          <span className="day-icon done">
            <Check size={16} strokeWidth={3} />
          </span>
          <span className="grow">
            <span className="title truncate">{w.name}</span>
            <span className="sub">
              {formatElapsed(workoutDurationMs(w))} · {workoutSetCount(w)} set{workoutSetCount(w) === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronRight size={18} className="faint" />
        </Link>
      ))}

      {plan && !planDone && <PlannedRow routine={plan.routine} weekly={plan.weekly} isPast={isPast} onEdit={() => onPlan(day)} />}

      {!plan && !dayWorkouts.length && !isPast && (
        <button className="day-row add" onClick={() => onPlan(day)}>
          <span className="day-icon">
            <CalendarPlus size={17} />
          </span>
          <span className="grow">
            <span className="title">Plan a routine</span>
            <span className="sub">Nothing planned{isToday ? ' today' : ''}</span>
          </span>
          <Plus size={18} className="faint" />
        </button>
      )}

      {!plan && !dayWorkouts.length && isPast && (
        <div className="day-row rest">
          <span className="grow sub">Rest day</span>
          <button className="btn btn-sm btn-ghost" onClick={() => logPastWorkout(day)}>
            <Plus size={15} strokeWidth={2.6} /> Log a workout
          </button>
        </div>
      )}
    </div>
  );
}

/** A routine planned for the day. Today's is started from the button under the week. */
function PlannedRow({ routine, weekly, isPast, onEdit }: { routine: Routine; weekly: boolean; isPast: boolean; onEdit: () => void }) {
  return (
    <div className={`day-row planned${isPast ? ' missed' : ''}`}>
      <span className="day-icon">{weekly ? <Repeat size={16} /> : <CalendarPlus size={16} />}</span>
      <span className="grow">
        <span className="title truncate">{routine.name}</span>
        <span className="sub">
          {isPast ? 'Planned · not logged' : weekly ? 'Planned · repeats weekly' : 'Planned'}
        </span>
      </span>
      {!isPast && (
        <button className="icon-btn" aria-label={`Change plan for ${routine.name}`} onClick={onEdit}>
          <Pencil size={17} />
        </button>
      )}
    </div>
  );
}
