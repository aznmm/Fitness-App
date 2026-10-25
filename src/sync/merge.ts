import type { BodyWeightEntry, Exercise, Routine, Settings, Workout } from '../types';

/** Everything that syncs between devices. The in-progress workout stays local. */
export interface SyncDoc {
  version: 1;
  workouts: Workout[];
  routines: Routine[];
  customExercises: Exercise[];
  bodyweights: BodyWeightEntry[];
  settings: Settings;
  settingsUpdatedAt: number;
  /** Tombstones: id → deletion time, so deletes propagate instead of reappearing. */
  deleted: Record<string, number>;
}

type Stamped = { id: string; updatedAt?: number };

/** Union by id; the newer copy wins (ties keep `a`). Tombstoned ids are dropped. */
export function mergeById<T extends Stamped>(a: T[], b: T[], deleted: Record<string, number>): T[] {
  const out = new Map<string, T>();
  for (const item of b) out.set(item.id, item);
  for (const item of a) {
    const other = out.get(item.id);
    if (!other || (item.updatedAt ?? 0) >= (other.updatedAt ?? 0)) out.set(item.id, item);
  }
  return [...out.values()].filter((item) => !(item.id in deleted));
}

export function mergeTombstones(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...b };
  for (const [id, t] of Object.entries(a)) out[id] = Math.max(t, out[id] ?? 0);
  return out;
}

/** Combine this device's data with the cloud copy. Nothing is lost unless it was deleted somewhere. */
export function mergeDocs(local: SyncDoc, remote: SyncDoc | null | undefined): SyncDoc {
  if (!remote) return local;
  const deleted = mergeTombstones(local.deleted ?? {}, remote.deleted ?? {});
  const newerSettings = (remote.settingsUpdatedAt ?? 0) > (local.settingsUpdatedAt ?? 0);
  return {
    version: 1,
    workouts: mergeById(local.workouts, remote.workouts ?? [], deleted).sort((x, y) => x.startedAt - y.startedAt),
    routines: mergeById(local.routines, remote.routines ?? [], deleted),
    customExercises: mergeById(local.customExercises, remote.customExercises ?? [], deleted),
    bodyweights: mergeById(local.bodyweights, remote.bodyweights ?? [], deleted).sort((x, y) => x.date - y.date),
    settings: newerSettings ? { ...local.settings, ...remote.settings } : local.settings,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt ?? 0, remote.settingsUpdatedAt ?? 0),
    deleted,
  };
}
