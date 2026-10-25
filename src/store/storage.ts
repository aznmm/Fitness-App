import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

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
