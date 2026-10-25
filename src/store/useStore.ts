import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BUILT_IN_EXERCISES } from '../data/exercises';
import { uid } from '../lib/id';
import { createWorkout, pruneIncomplete, routineFromWorkout, type WorkoutUpdater } from '../lib/workoutOps';
import type { BodyWeightEntry, Exercise, RestTimer, Routine, Settings, Workout } from '../types';
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
};

export interface AppData {
  workouts: Workout[];
  active: Workout | null;
  routines: Routine[];
  customExercises: Exercise[];
  bodyweights: BodyWeightEntry[];
  settings: Settings;
  rest: RestTimer | null;
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

  updateSettings(patch: Partial<Settings>): void;
  replaceAll(data: Partial<AppData>): void;
  resetAll(): void;
}

export type AppState = AppData & AppActions;

const EMPTY: AppData = {
  workouts: [],
  active: null,
  routines: [],
  customExercises: [],
  bodyweights: [],
  settings: DEFAULT_SETTINGS,
  rest: null,
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
          routines: routine ? s.routines.map((r) => (r.id === routine.id ? { ...r, lastUsedAt: workout.startedAt } : r)) : s.routines,
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
        const saved = { ...pruneIncomplete(active), endedAt: Date.now() };
        if (!saved.exercises.length) return null;
        set((s) => ({ workouts: [...s.workouts, saved], active: null, rest: null }));
        return saved;
      },

      addWorkout(w) {
        set((s) => ({ workouts: [...s.workouts, w] }));
      },

      importWorkouts(workouts, exercises) {
        set((s) => ({
          workouts: [...s.workouts, ...workouts].sort((a, b) => a.startedAt - b.startedAt),
          customExercises: [...s.customExercises, ...exercises.map((e) => ({ ...e, custom: true }))],
        }));
      },

      updateWorkout(id, fn) {
        set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? fn(w) : w)) }));
      },

      deleteWorkout(id) {
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
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

      saveRoutine(r) {
        set((s) => {
          const exists = s.routines.some((x) => x.id === r.id);
          return { routines: exists ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] };
        });
      },

      deleteRoutine(id) {
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
      },

      routineFromWorkout(workoutId) {
        const w = get().workouts.find((x) => x.id === workoutId);
        if (!w) return null;
        const routine = routineFromWorkout(w);
        set((s) => ({ routines: [...s.routines, routine] }));
        return routine;
      },

      saveCustomExercise(e) {
        set((s) => {
          const custom = { ...e, custom: true };
          const exists = s.customExercises.some((x) => x.id === e.id);
          return {
            customExercises: exists ? s.customExercises.map((x) => (x.id === e.id ? custom : x)) : [...s.customExercises, custom],
          };
        });
      },

      deleteCustomExercise(id) {
        set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) }));
      },

      addBodyweight(weightKg, date = Date.now()) {
        set((s) => ({ bodyweights: [...s.bodyweights, { id: uid(), date, weight: weightKg }].sort((a, b) => a.date - b.date) }));
      },

      deleteBodyweight(id) {
        set((s) => ({ bodyweights: s.bodyweights.filter((b) => b.id !== id) }));
      },

      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      replaceAll(data) {
        set({ ...EMPTY, ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
      },

      resetAll() {
        set({ ...EMPTY });
      },
    }),
    {
      name: 'forge-data',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: ({ workouts, active, routines, customExercises, bodyweights, settings, rest }) => ({
        workouts,
        active,
        routines,
        customExercises,
        bodyweights,
        settings,
        rest,
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
