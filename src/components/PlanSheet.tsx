import { Check, Moon, Plus } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, toDateInput } from '../lib/dates';
import { planFor, weekdayOf, weeklyRoutineId } from '../lib/plans';
import { useStore } from '../store/useStore';
import type { Routine } from '../types';
import { toast } from './Dialogs';
import { Sheet } from './Sheet';
import { RoutineTile, useCreateRoutine } from './StartWorkoutSheet';

/** A day to plan, or a weekday on the repeating schedule. */
export type PlanTarget = { date: number } | { weekday: number };

/** Monday 1 Jan 2024, used to name weekdays in the user's locale. */
const A_MONDAY = new Date(2024, 0, 1).getTime();

export function weekdayName(weekday: number, style: 'long' | 'short' = 'long'): string {
  return formatDate(A_MONDAY + weekday * 86_400_000 + 3_600_000 * 12, { weekday: style });
}

/** Choose the routine for a day, optionally repeating every week. */
export function PlanSheet({ target, onClose }: { target: PlanTarget; onClose: () => void }) {
  const plans = useStore((s) => s.plans);
  const routines = useStore((s) => s.routines);
  const setDatePlan = useStore((s) => s.setDatePlan);
  const clearDatePlan = useStore((s) => s.clearDatePlan);
  const setWeekdayPlan = useStore((s) => s.setWeekdayPlan);
  const createRoutine = useCreateRoutine();
  const navigate = useNavigate();

  const isDate = 'date' in target;
  const weekday = isDate ? weekdayOf(target.date) : target.weekday;
  const dayName = weekdayName(weekday);
  const weeklyId = weeklyRoutineId(plans, weekday);
  const weekly = routines.some((r) => r.id === weeklyId) ? weeklyId : null;
  const current = isDate ? planFor(plans, routines, target.date) : null;
  const [repeat, setRepeat] = useState(isDate ? (current?.weekly ?? false) : true);
  const selectedId = isDate ? (repeat ? weekly : current?.routine.id) : weekly;
  const dateLabel = isDate ? formatDate(target.date, { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const choose = (routine: Routine) => {
    if (!isDate) {
      setWeekdayPlan(weekday, routine.id);
      toast(`${routine.name} every ${dayName}`);
    } else if (repeat) {
      setWeekdayPlan(weekday, routine.id);
      clearDatePlan(toDateInput(target.date));
      toast(`${routine.name} planned every ${dayName}`);
    } else {
      setDatePlan(toDateInput(target.date), routine.id);
      toast(`${routine.name} planned for ${dateLabel}`);
    }
    onClose();
  };

  // On the schedule this makes the weekday a rest day; on a date it removes the
  // plan, or skips just this week when the day comes from the schedule.
  const remove = () => {
    if (!isDate || repeat) {
      setWeekdayPlan(weekday, null);
      if (isDate) clearDatePlan(toDateInput(target.date));
    } else if (weekly) setDatePlan(toDateInput(target.date), null);
    else clearDatePlan(toDateInput(target.date));
    onClose();
  };
  const removeLabel = !isDate ? 'Rest day' : repeat ? `Remove from every ${dayName}` : current?.weekly ? `Skip this ${dayName}` : 'Remove plan';
  const canRemove = !isDate || (repeat ? !!weekly : !!current);
  // A day that comes from the weekly plan can also be skipped just this once.
  const canSkip = isDate && repeat && !!current?.weekly;
  const skip = () => {
    if (!isDate) return;
    setDatePlan(toDateInput(target.date), null);
    toast(`Skipping ${dateLabel}`);
    onClose();
  };

  const buildNew = () => {
    const id = createRoutine(false);
    if (!isDate || repeat) setWeekdayPlan(weekday, id);
    else setDatePlan(toDateInput(target.date), id);
    onClose();
    navigate(`/routines/${id}?new=1`);
  };

  return (
    <Sheet title={isDate ? `Plan ${dateLabel}` : `Every ${dayName}`} onClose={onClose}>
      {isDate && (
        <div className="list" style={{ marginBottom: 20 }}>
          <label className="list-item" style={{ minHeight: 52 }}>
            <span className="grow title">Repeat every {dayName}</span>
            <span className="switch">
              <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} aria-label={`Repeat every ${dayName}`} />
              <span />
            </span>
          </label>
        </div>
      )}

      {routines.length > 0 && <div className="list-header">Routine</div>}
      <div className="list with-icons">
        {routines.map((r) => (
          <RoutineOption key={r.id} routine={r} selected={r.id === selectedId} onClick={() => choose(r)} />
        ))}
        <button className="list-item" onClick={buildNew}>
          <span className="tile">
            <Plus size={20} strokeWidth={2.5} />
          </span>
          <span className="grow">
            <span className="title" style={{ display: 'block' }}>
              Build a new routine
            </span>
            <span className="sub">{routines.length ? 'Plan it here, then add exercises' : 'You have no routines yet'}</span>
          </span>
        </button>
      </div>

      {canRemove && (
        <div className="list" style={{ marginTop: 20 }}>
          {canSkip && (
            <button className="list-item" onClick={skip} style={{ color: 'var(--accent)', justifyContent: 'center' }}>
              Skip this {dayName}
            </button>
          )}
          <button className="list-item" onClick={remove} style={!isDate ? undefined : { color: 'var(--red)', justifyContent: 'center' }}>
            {!isDate ? (
              <>
                <span className="tile" style={{ '--tile': 'var(--text-2)' } as CSSProperties}>
                  <Moon size={19} />
                </span>
                <span className="grow title">{removeLabel}</span>
                {!weekly && <Check size={20} color="var(--accent)" strokeWidth={2.6} />}
              </>
            ) : (
              removeLabel
            )}
          </button>
        </div>
      )}
      {isDate && (
        <p className="tiny muted" style={{ margin: '14px 4px 0' }}>
          {repeat ? `Shows up every ${dayName} from now on.` : `Just this ${dayName}. Turn on repeat to plan it every week.`}
        </p>
      )}
    </Sheet>
  );
}

function RoutineOption({ routine, selected, onClick }: { routine: Routine; selected: boolean; onClick: () => void }) {
  return (
    <button className="list-item" onClick={onClick} aria-pressed={selected}>
      <RoutineTile routine={routine} />
      <span className="grow">
        <span className="title truncate" style={{ display: 'block' }}>
          {routine.name}
        </span>
        <span className="sub">
          {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'}
        </span>
      </span>
      {selected && <Check size={20} color="var(--accent)" strokeWidth={2.6} />}
    </button>
  );
}
