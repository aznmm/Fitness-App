import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

/**
 * Tells other open tabs of the app that saved data changed. Each tab keeps the
 * whole state in memory and writes all of it, so without this a tab left open
 * in the background would save its old copy over a workout finished elsewhere.
 */
const channel = typeof indexedDB !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('forge-data') : null;

/** Runs `onChange` when another tab saves; returns an unsubscribe function. */
export function onOtherTabWrite(onChange: (name: string) => void): () => void {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => typeof e.data === 'string' && onChange(e.data);
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
}

/**
 * IndexedDB has far more room than localStorage (years of workouts fit
 * easily). Falls back to memory where IndexedDB doesn't exist (tests, some
 * private-browsing modes).
 */
export const appStorage: StateStorage = {
  async getItem(name) {
    if (typeof indexedDB === 'undefined') return memory.get(name) ?? null;
    try {
      return (await get<string>(name)) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  async setItem(name, value) {
    memory.set(name, value);
    if (typeof indexedDB === 'undefined') return;
    try {
      await set(name, value);
      channel?.postMessage(name);
    } catch {
      // Keep the in-memory copy; the next successful write will catch up.
    }
  },
  async removeItem(name) {
    memory.delete(name);
    if (typeof indexedDB === 'undefined') return;
    try {
      await del(name);
    } catch {
      // ignore
    }
  },
};

/** Ask the browser not to evict our data under storage pressure. */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    // ignore
  }
}
