import { create } from 'zustand';
import { useStore, type AppState } from '../store/useStore';
import { createSupabaseBackend, type SyncBackend } from './backend';
import { SUPABASE_KEY, SUPABASE_URL, syncConfigured } from './config';
import { mergeDocs, type SyncDoc } from './merge';

export type SyncStatus = 'unconfigured' | 'loading' | 'signed-out' | 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  email?: string;
  lastSyncedAt?: number;
  error?: string;
}

export const useSync = create<SyncState>(() => ({ status: syncConfigured ? 'loading' : 'unconfigured' }));

let backend: SyncBackend | null = null;
let userId: string | null = null;
let running = false;
let rerun = false;
let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const DEBOUNCE_MS = 2500;

export function localDoc(s: AppState = useStore.getState()): SyncDoc {
  return {
    version: 1,
    workouts: s.workouts,
    routines: s.routines,
    customExercises: s.customExercises,
    bodyweights: s.bodyweights,
    settings: s.settings,
    settingsUpdatedAt: s.settingsUpdatedAt,
    deleted: s.deleted,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Pull the cloud copy, merge it with this device's data, and push the result. */
export async function syncNow(): Promise<void> {
  if (!backend || !userId) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  clearTimeout(timer);
  useSync.setState({ status: 'syncing', error: undefined });
  try {
    const remote = await backend.load(userId);
    // Merge against the store as it is *now*, so changes made while loading aren't lost.
    const local = localDoc();
    const merged = mergeDocs(local, remote);
    if (!same(merged, local)) {
      applying = true;
      const { version: _v, ...data } = merged;
      useStore.setState(data);
      applying = false;
    }
    if (!same(merged, remote)) await backend.save(userId, merged);
    useSync.setState({ status: 'idle', lastSyncedAt: Date.now() });
  } catch (e) {
    useSync.setState({ status: 'error', error: friendlyError(e) });
  } finally {
    applying = false;
    running = false;
    if (rerun) {
      rerun = false;
      void syncNow();
    }
  }
}

function schedule() {
  if (!userId) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (/forge_data|relation .* does not exist|schema cache/i.test(msg)) return 'The sync table is missing. Run the setup SQL in Supabase.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Couldn't reach the server. Check your connection.";
  return msg;
}

function onSession(session: { userId: string; email: string } | null) {
  userId = session?.userId ?? null;
  useSync.setState({ status: session ? 'idle' : 'signed-out', email: session?.email, error: undefined });
  // Supabase warns against calling it from inside its own auth callback; defer.
  if (session) setTimeout(() => void syncNow(), 0);
}

let unsubscribe: (() => void) | undefined;

/** Connect a backend and start syncing on changes. Exported for tests. */
export async function connect(b: SyncBackend): Promise<void> {
  backend = b;
  b.onAuthChange(onSession);
  onSession(await b.getSession());
  unsubscribe?.();
  unsubscribe = useStore.subscribe((s, prev) => {
    if (applying) return;
    if (
      s.workouts !== prev.workouts ||
      s.routines !== prev.routines ||
      s.customExercises !== prev.customExercises ||
      s.bodyweights !== prev.bodyweights ||
      s.settings !== prev.settings ||
      s.deleted !== prev.deleted
    ) {
      schedule();
    }
  });
}

/** Called once at startup. Does nothing unless a Supabase project is configured. */
let started = false;

export async function initSync(): Promise<void> {
  if (!syncConfigured || started) return;
  started = true;
  try {
    await connect(await createSupabaseBackend(SUPABASE_URL, SUPABASE_KEY));
  } catch (e) {
    useSync.setState({ status: 'error', error: friendlyError(e) });
    return;
  }
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    const last = useSync.getState().lastSyncedAt ?? 0;
    if (document.visibilityState === 'visible' && Date.now() - last > 60_000) void syncNow();
  });
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!backend) throw new Error('Sync is not set up.');
  try {
    await backend.signIn(email.trim(), password);
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

export async function signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  if (!backend) throw new Error('Sync is not set up.');
  try {
    return await backend.signUp(email.trim(), password);
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

export async function signOut(): Promise<void> {
  clearTimeout(timer);
  await backend?.signOut();
  onSession(null);
}
