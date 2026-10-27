import type { Plan, Routine } from '../types';
import { startOfDay, toDateInput } from './dates';

/** 0 = Monday … 6 = Sunday, matching weeks that start on Monday. */
export function weekdayOf(t: number): number {
  return (new Date(t).getDay() + 6) % 7;
}

export const datePlanId = (date: string) => `date:${date}`;
export const weekdayPlanId = (weekday: number) => `weekday:${weekday}`;

export interface DayPlan {
  routine: Routine;
  /** True when it comes from the weekly schedule rather than this date. */
  weekly: boolean;
}

/** Routine id on the weekly schedule for a weekday, if any. */
export function weeklyRoutineId(plans: Plan[], weekday: number): string | null {
  return plans.find((p) => p.id === weekdayPlanId(weekday))?.routineId ?? null;
}

/**
 * The routine planned for the day containing `t`. The weekly schedule only
 * applies from today on, so setting one up doesn't rewrite past weeks.
 */
export function planFor(plans: Plan[], routines: Routine[], t: number, now = Date.now()): DayPlan | null {
  const exists = (id: string | null | undefined) => (id ? routines.find((r) => r.id === id) : undefined);
  const date = plans.find((p) => p.id === datePlanId(toDateInput(t)));
  // A date plan for a deleted routine no longer overrides the schedule.
  if (date && (date.routineId === null || exists(date.routineId))) {
    const routine = exists(date.routineId);
    return routine ? { routine, weekly: false } : null;
  }
  if (startOfDay(t) < startOfDay(now)) return null;
  const routine = exists(weeklyRoutineId(plans, weekdayOf(t)));
  return routine ? { routine, weekly: true } : null;
}
