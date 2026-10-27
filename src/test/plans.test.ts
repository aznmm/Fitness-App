import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, toDateInput } from '../lib/dates';
import { planFor, weekdayOf } from '../lib/plans';
import { useStore } from '../store/useStore';
import type { Routine } from '../types';
import { NOW } from './helpers';

const push: Routine = { id: 'push', name: 'Push', createdAt: 0, exercises: [{ id: 'e1', exerciseId: 'bench-press', sets: 3 }] };
const pull: Routine = { id: 'pull', name: 'Pull', createdAt: 0, exercises: [{ id: 'e2', exerciseId: 'pull-up', sets: 3 }] };
const tomorrow = addDays(NOW, 1);
const nextWeek = addDays(NOW, 7);
const lastWeek = addDays(NOW, -7);

describe('day plans', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
    useStore.getState().saveRoutine(push);
    useStore.getState().saveRoutine(pull);
  });
  const plan = (t: number) => {
    const { plans, routines } = useStore.getState();
    return planFor(plans, routines, t, NOW);
  };

  it('numbers weekdays from Monday', () => {
    expect(weekdayOf(NOW)).toBe(2); // NOW is a Wednesday
    expect(weekdayOf(addDays(NOW, 5))).toBe(0);
  });

  it('plans a single day', () => {
    useStore.getState().setDatePlan(toDateInput(tomorrow), 'push');
    expect(plan(tomorrow)).toMatchObject({ routine: { id: 'push' }, weekly: false });
    expect(plan(addDays(tomorrow, 7))).toBeNull();
  });

  it('repeats a weekly plan from today on, not in past weeks', () => {
    useStore.getState().setWeekdayPlan(weekdayOf(NOW), 'pull');
    expect(plan(NOW)).toMatchObject({ routine: { id: 'pull' }, weekly: true });
    expect(plan(nextWeek)?.routine.id).toBe('pull');
    expect(plan(lastWeek)).toBeNull();
  });

  it('lets one date override or skip the weekly plan', () => {
    const s = useStore.getState();
    s.setWeekdayPlan(weekdayOf(nextWeek), 'pull');
    s.setDatePlan(toDateInput(nextWeek), 'push');
    expect(plan(nextWeek)?.routine.id).toBe('push');
    s.setDatePlan(toDateInput(nextWeek), null);
    expect(plan(nextWeek)).toBeNull();
    expect(plan(addDays(nextWeek, 7))?.routine.id).toBe('pull');
    s.clearDatePlan(toDateInput(nextWeek));
    expect(plan(nextWeek)?.routine.id).toBe('pull');
  });

  it('ignores plans for deleted routines', () => {
    const s = useStore.getState();
    s.setWeekdayPlan(weekdayOf(tomorrow), 'pull');
    s.setDatePlan(toDateInput(tomorrow), 'push');
    s.deleteRoutine('push');
    expect(plan(tomorrow)?.routine.id).toBe('pull');
    s.deleteRoutine('pull');
    expect(plan(tomorrow)).toBeNull();
  });

  it('removes a weekday from the schedule', () => {
    const s = useStore.getState();
    s.setWeekdayPlan(weekdayOf(tomorrow), 'pull');
    s.setWeekdayPlan(weekdayOf(tomorrow), null);
    expect(plan(tomorrow)).toBeNull();
    expect(useStore.getState().plans).toEqual([]);
  });
});
