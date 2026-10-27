import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BUILT_IN_EXERCISES } from '../data/exercises';
import { uid } from '../lib/id';
import { datePlanId, weekdayPlanId } from '../lib/plans';
import { stepsId } from '../lib/steps';
import { createWorkout, pruneIncomplete, routineFromWorkout, type WorkoutUpdater } from '../lib/workoutOps';
import type { BodyWeightEntry, Exercise, Plan, RestTimer, Routine, Settings, StepEntry, Workout } from '../types';
import { appStorage } from './storage';

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lb',
  sex: 'male',
  defaultRestSec: 120,
  autoRestTimer: true,
  restSound: true,
  theme: 'system',
  weeklyGoal: 3,
  smartSuggestions: true,
  stepGoal: 10_000,
};

export interface AppData {
  workouts: Workout[];
  active: Workout | null;
  routines: Routine[];
  customExercises: Exercise[];
  bodyweights: BodyWeightEntry[];
  /** Routines planned for dates and weekdays. */
  plans: Plan[];
  steps: StepEntry[];
  settings: Settings;
  rest: RestTimer | null;
  /** When settings last changed, so synced devices keep the newest. */
  settingsUpdatedAt: number;
  /** Deleted record ids → deletion time, so deletes reach other devices. */
  deleted: Record<string, number>;
}

export interface AppActions {
  /** Start from a saved routine (`routineId`) or an unsaved template such as a past workout. */
  startWorkout(opts?: { routineId?: string; template?: Routine; name?: string }): Workout;
  updateActive(fn: WorkoutUpdater): void;
  discardWorkout(): void;
  /** Saves the active workout. Returns null if no sets were completed. */
  finishWorkout(): Workout | null;

  addWorkout(w: Workout): void;
  /** Bulk import (e.g. from another app's CSV export). */
  importWorkouts(workouts: Workout[], exercises: Exercise[]): void;
  updateWorkout(id: string, fn: WorkoutUpdater): void;
  deleteWorkout(id: string): void;

  startRest(sec: number): void;
  adjustRest(deltaSec: number): void;
  stopRest(): void;

  saveRoutine(r: Routine): void;
  deleteRoutine(id: string): void;
  routineFromWorkout(workoutId: string): Routine | null;

  saveCustomExercise(e: Exercise): void;
  deleteCustomExercise(id: string): void;

  addBodyweight(weightKg: number, date?: number): void;
  deleteBodyweight(id: string): void;

  /** Plan a routine (or nothing, to skip a weekly plan) on a YYYY-MM-DD date. */
  setDatePlan(date: string, routineId: string | null): void;
  /** Remove a date's own plan so the weekly schedule applies again. */
  clearDatePlan(date: string): void;
  /** Put a routine on the weekly schedule, or take the weekday off it with null. */
  setWeekdayPlan(weekday: number, routineId: string | null): void;

  /** Record daily step counts, replacing what was there for those dates. */
  saveSteps(entries: { date: string; count: number }[], source: StepEntry['source']): void;
  deleteSteps(date: string): void;

  updateSettings(patch: Partial<Settings>): void;
  replaceAll(data: Partial<AppData>): void;
  /** Delete everything (also on other devices once synced). */
  resetAll(): void;
}

export type AppState = AppData & AppActions;

const EMPTY: AppData = {
  workouts: [],
  active: null,
  routines: [],
  customExercises: [],
  bodyweights: [],
  plans: [],
  steps: [],
  settings: DEFAULT_SETTINGS,
  rest: null,
  settingsUpdatedAt: 0,
  deleted: {},
};

const stamp = <T extends object>(item: T): T & { updatedAt: number } => ({ ...item, updatedAt: Date.now() });
const tombstone = (deleted: Record<string, number>, ...ids: string[]) => {
  const now = Date.now();
  return { ...deleted, ...Object.fromEntries(ids.map((id) => [id, now])) };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      startWorkout(opts = {}) {
        const routine = opts.routineId ? get().routines.find((r) => r.id === opts.routineId) : undefined;
        const workout = createWorkout({ name: opts.name, routine: routine ?? opts.template });
        if (!routine) delete workout.routineId;
        set((s) => ({
          active: workout,
          rest: null,
          routines: routine ? s.routines.map((r) => (r.id === routine.id ? stamp({ ...r, lastUsedAt: workout.startedAt }) : r)) : s.routines,
        }));
        return workout;
      },

      updateActive(fn) {
        const { active } = get();
        if (active) set({ active: fn(active) });
      },

      discardWorkout() {
        set({ active: null, rest: null });
      },

      finishWorkout() {
        const { active } = get();
        if (!active) return null;
        const saved = stamp({ ...pruneIncomplete(active), endedAt: Date.now() });
        if (!saved.exercises.length) return null;
        set((s) => ({ workouts: [...s.workouts, saved], active: null, rest: null }));
        return saved;
      },

      addWorkout(w) {
        set((s) => ({ workouts: [...s.workouts, stamp(w)] }));
      },

      importWorkouts(workouts, exercises) {
        set((s) => ({
          workouts: [...s.workouts, ...workouts.map(stamp)].sort((a, b) => a.startedAt - b.startedAt),
          customExercises: [...s.customExercises, ...exercises.map((e) => stamp({ ...e, custom: true }))],
        }));
      },

      updateWorkout(id, fn) {
        set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? stamp(fn(w)) : w)) }));
      },

      deleteWorkout(id) {
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id), deleted: tombstone(s.deleted, id) }));
      },

      startRest(sec) {
        if (sec > 0) set({ rest: { endsAt: Date.now() + sec * 1000, totalSec: sec } });
      },

      adjustRest(deltaSec) {
        const { rest } = get();
        if (!rest) return;
        const endsAt = rest.endsAt + deltaSec * 1000;
        if (endsAt <= Date.now()) set({ rest: null });
        else set({ rest: { endsAt, totalSec: Math.max(1, rest.totalSec + deltaSec) } });
      },

      stopRest() {
        set({ rest: null });
      },

      saveRoutine(routine) {
        const r = stamp(routine);
        set((s) => {
          const exists = s.routines.some((x) => x.id === r.id);
          return { routines: exists ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] };
        });
      },

      deleteRoutine(id) {
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id), deleted: tombstone(s.deleted, id) }));
      },

      routineFromWorkout(workoutId) {
        const w = get().workouts.find((x) => x.id === workoutId);
        if (!w) return null;
        const routine = stamp(routineFromWorkout(w));
        set((s) => ({ routines: [...s.routines, routine] }));
        return routine;
      },

      saveCustomExercise(e) {
        set((s) => {
          const custom = stamp({ ...e, custom: true });
          const exists = s.customExercises.some((x) => x.id === e.id);
          return {
            customExercises: exists ? s.customExercises.map((x) => (x.id === e.id ? custom : x)) : [...s.customExercises, custom],
          };
        });
      },

      deleteCustomExercise(id) {
        set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id), deleted: tombstone(s.deleted, id) }));
      },

      addBodyweight(weightKg, date = Date.now()) {
        set((s) => ({ bodyweights: [...s.bodyweights, stamp({ id: uid(), date, weight: weightKg })].sort((a, b) => a.date - b.date) }));
      },

      deleteBodyweight(id) {
        set((s) => ({ bodyweights: s.bodyweights.filter((b) => b.id !== id), deleted: tombstone(s.deleted, id) }));
      },

      setDatePlan(date, routineId) {
        const plan = stamp({ id: datePlanId(date), date, routineId });
        set((s) => ({ plans: [...s.plans.filter((p) => p.id !== plan.id), plan] }));
      },

      clearDatePlan(date) {
        const id = datePlanId(date);
        set((s) => (s.plans.some((p) => p.id === id) ? { plans: s.plans.filter((p) => p.id !== id), deleted: tombstone(s.deleted, id) } : {}));
      },

      setWeekdayPlan(weekday, routineId) {
        const id = weekdayPlanId(weekday);
        set((s) => {
          const rest = s.plans.filter((p) => p.id !== id);
          return routineId ? { plans: [...rest, stamp({ id, weekday, routineId })] } : { plans: rest, deleted: tombstone(s.deleted, id) };
        });
      },

      saveSteps(entries, source) {
        set((s) => {
          const byDate = new Map(s.steps.map((e) => [e.date, e]));
          let changed = false;
          for (const { date, count } of entries) {
            const old = byDate.get(date);
            if (old && old.count === count && old.source === source) continue;
            byDate.set(date, stamp({ id: stepsId(date), date, count, source }));
            changed = true;
          }
          return changed ? { steps: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) } : {};
        });
      },

      deleteSteps(date) {
        const id = stepsId(date);
        set((s) => ({ steps: s.steps.filter((e) => e.id !== id), deleted: tombstone(s.deleted, id) }));
      },

      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: Date.now() }));
      },

      replaceAll(data) {
        set((s) => {
          // Restored records win over earlier deletes of the same ids.
          const restored = new Set(
            [...(data.workouts ?? []), ...(data.routines ?? []), ...(data.customExercises ?? []), ...(data.bodyweights ?? []), ...(data.plans ?? []), ...(data.steps ?? [])].map(
              (x) => x.id,
            ),
          );
          const deleted = Object.fromEntries(Object.entries(s.deleted).filter(([id]) => !restored.has(id)));
          const stampAll = <T extends object>(xs: T[] | undefined) => (xs ?? []).map(stamp);
          return {
            ...EMPTY,
            ...data,
            workouts: stampAll(data.workouts),
            routines: stampAll(data.routines),
            customExercises: stampAll(data.customExercises),
            bodyweights: stampAll(data.bodyweights),
            plans: stampAll(data.plans),
            steps: stampAll(data.steps),
            settings: { ...DEFAULT_SETTINGS, ...data.settings },
            settingsUpdatedAt: Date.now(),
            deleted,
          };
        });
      },

      resetAll() {
        set((s) => ({
          ...EMPTY,
          deleted: tombstone(s.deleted, ...[...s.workouts, ...s.routines, ...s.customExercises, ...s.bodyweights, ...s.plans, ...s.steps].map((x) => x.id)),
        }));
      },
    }),
    {
      name: 'forge-data',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: ({ workouts, active, routines, customExercises, bodyweights, plans, steps, settings, rest, settingsUpdatedAt, deleted }) => ({
        workouts,
        active,
        routines,
        customExercises,
        bodyweights,
        plans,
        steps,
        settings,
        rest,
        settingsUpdatedAt,
        deleted,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);

/** Built-in + custom exercises, as a list and an id lookup. */
export function useExercises(): { list: Exercise[]; byId: Map<string, Exercise> } {
  const custom = useStore((s) => s.customExercises);
  return useMemo(() => {
    const list = [...BUILT_IN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name));
    return { list, byId: new Map(list.map((e) => [e.id, e])) };
  }, [custom]);
}

/** Most recent bodyweight entry, in kg. */
export function useBodyweight(): number | undefined {
  return useStore((s) => (s.bodyweights.length ? s.bodyweights[s.bodyweights.length - 1].weight : undefined));
}

export function exerciseName(byId: Map<string, Exercise>, id: string): string {
  return byId.get(id)?.name ?? 'Unknown exercise';
}
