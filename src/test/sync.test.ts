import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, useStore } from '../store/useStore';
import type { SyncBackend } from '../sync/backend';
import { connect, localDoc, syncNow, useSync } from '../sync/engine';
import { mergeDocs, mergeById, type SyncDoc } from '../sync/merge';
import { NOW, set, workout } from './helpers';

const doc = (patch: Partial<SyncDoc> = {}): SyncDoc => ({
  version: 1,
  workouts: [],
  routines: [],
  customExercises: [],
  bodyweights: [],
  plans: [],
  steps: [],
  settings: DEFAULT_SETTINGS,
  settingsUpdatedAt: 0,
  deleted: {},
  ...patch,
});

describe('mergeById', () => {
  it('unions records and keeps the newer copy', () => {
    const a = [{ id: '1', updatedAt: 5, v: 'a' }, { id: '2', updatedAt: 1, v: 'a' }];
    const b = [{ id: '1', updatedAt: 3, v: 'b' }, { id: '2', updatedAt: 9, v: 'b' }, { id: '3', v: 'b' }];
    const out = mergeById(a, b, {});
    expect(Object.fromEntries(out.map((x) => [x.id, x.v]))).toEqual({ '1': 'a', '2': 'b', '3': 'b' });
  });

  it('drops tombstoned ids', () => {
    expect(mergeById([{ id: '1' }], [{ id: '2' }], { '1': 10 })).toEqual([{ id: '2' }]);
  });
});

describe('mergeDocs', () => {
  it('combines workouts logged on two phones', () => {
    const phone = doc({ workouts: [{ ...workout(NOW - 1000, {}), id: 'p' }] });
    const laptop = doc({ workouts: [{ ...workout(NOW - 5000, {}), id: 'l' }] });
    expect(mergeDocs(phone, laptop).workouts.map((w) => w.id)).toEqual(['l', 'p']);
  });

  it('propagates deletes from either side', () => {
    const w = { ...workout(NOW, {}), id: 'x', updatedAt: 1 };
    const deletedHere = doc({ deleted: { x: 2 } });
    const stillThere = doc({ workouts: [w] });
    expect(mergeDocs(deletedHere, stillThere).workouts).toEqual([]);
    expect(mergeDocs(stillThere, deletedHere).workouts).toEqual([]);
  });

  it('brings back a record saved again after it was deleted', () => {
    const replanned = doc({ plans: [{ id: 'date:2026-10-21', date: '2026-10-21', routineId: 'r', updatedAt: 5 }], deleted: { 'date:2026-10-21': 3 } });
    const stale = doc({ deleted: { 'date:2026-10-21': 3 } });
    expect(mergeDocs(stale, replanned).plans).toHaveLength(1);
    expect(mergeDocs(replanned, stale).plans).toHaveLength(1);
    const deletedLater = doc({ deleted: { 'date:2026-10-21': 9 } });
    expect(mergeDocs(deletedLater, replanned).plans).toEqual([]);
  });

  it('merges steps and plans from another device', () => {
    const phone = doc({ steps: [{ id: 'steps:2026-10-21', date: '2026-10-21', count: 5000, source: 'health', updatedAt: 2 }] });
    const laptop = doc({
      steps: [{ id: 'steps:2026-10-21', date: '2026-10-21', count: 4000, source: 'manual', updatedAt: 1 }],
      plans: [{ id: 'weekday:0', weekday: 0, routineId: 'r', updatedAt: 1 }],
    });
    const merged = mergeDocs(laptop, phone);
    expect(merged.steps.map((e) => e.count)).toEqual([5000]);
    expect(merged.plans).toHaveLength(1);
    // Docs saved before plans and steps existed still merge.
    expect(mergeDocs(phone, { ...laptop, plans: undefined, steps: undefined } as unknown as SyncDoc).steps).toHaveLength(1);
  });

  it('keeps the newest settings', () => {
    const older = doc({ settings: { ...DEFAULT_SETTINGS, unit: 'kg' }, settingsUpdatedAt: 1 });
    const newer = doc({ settings: { ...DEFAULT_SETTINGS, unit: 'lb' }, settingsUpdatedAt: 2 });
    expect(mergeDocs(older, newer).settings.unit).toBe('lb');
    expect(mergeDocs(newer, older).settings.unit).toBe('lb');
  });

  it('returns local data when the cloud is empty', () => {
    const local = doc({ workouts: [workout(NOW, {})] });
    expect(mergeDocs(local, null)).toBe(local);
  });
});

/** In-memory stand-in for Supabase. */
function fakeBackend(initial: SyncDoc | null = null) {
  let cloud = initial;
  const calls = { saves: 0 };
  let beforeLoad: (() => void) | undefined;
  const backend: SyncBackend = {
    getSession: async () => ({ userId: 'u1', email: 'me@example.com' }),
    onAuthChange: () => {},
    signIn: async () => {},
    signUp: async () => 'signed-in',
    signOut: async () => {},
    load: async () => {
      beforeLoad?.();
      return cloud ? structuredClone(cloud) : null;
    },
    save: async (_u, d) => {
      calls.saves++;
      cloud = structuredClone(d);
    },
  };
  return { backend, calls, cloud: () => cloud, onLoad: (fn: () => void) => (beforeLoad = fn) };
}

describe('sync engine', () => {
  beforeEach(() => {
    useStore.setState({ workouts: [], routines: [], customExercises: [], bodyweights: [], plans: [], steps: [], deleted: {}, settingsUpdatedAt: 0, settings: DEFAULT_SETTINGS });
  });

  it('uploads local data and pulls down the cloud copy', async () => {
    const remoteWorkout = { ...workout(NOW - 9000, { squat: [set(100, 5)] }), id: 'remote' };
    const fake = fakeBackend(doc({ workouts: [remoteWorkout] }));
    useStore.getState().addWorkout({ ...workout(NOW, { 'bench-press': [set(80, 5)] }), id: 'local' });
    await connect(fake.backend);
    await syncNow();
    expect(useStore.getState().workouts.map((w) => w.id).sort()).toEqual(['local', 'remote']);
    expect(fake.cloud()!.workouts.map((w) => w.id).sort()).toEqual(['local', 'remote']);
    expect(useSync.getState()).toMatchObject({ status: 'idle', email: 'me@example.com' });
  });

  it('does not lose a workout finished while the cloud copy was loading', async () => {
    const fake = fakeBackend(doc());
    await connect(fake.backend);
    fake.onLoad(() => useStore.getState().addWorkout({ ...workout(NOW, {}), id: 'mid-sync' }));
    await syncNow();
    expect(useStore.getState().workouts.map((w) => w.id)).toContain('mid-sync');
    expect(fake.cloud()!.workouts.map((w) => w.id)).toContain('mid-sync');
  });

  it('skips the upload when nothing changed', async () => {
    const fake = fakeBackend(null);
    await connect(fake.backend);
    await syncNow();
    const saves = fake.calls.saves;
    await syncNow();
    expect(fake.calls.saves).toBe(saves);
    expect(localDoc().version).toBe(1);
  });

  it('records deletes so they reach other devices', async () => {
    useStore.getState().addWorkout({ ...workout(NOW, {}), id: 'gone' });
    const fake = fakeBackend(null);
    await connect(fake.backend);
    await syncNow();
    useStore.getState().deleteWorkout('gone');
    await syncNow();
    expect(fake.cloud()!.workouts).toEqual([]);
    expect(fake.cloud()!.deleted).toHaveProperty('gone');
  });

  it('reports a missing table in plain language', async () => {
    const fake = fakeBackend(null);
    fake.backend.load = async () => {
      throw { message: 'relation "public.forge_data" does not exist' };
    };
    await connect(fake.backend);
    await syncNow();
    expect(useSync.getState()).toMatchObject({ status: 'error', error: expect.stringMatching(/setup SQL/) });
  });
});
