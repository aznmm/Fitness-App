import type { SyncDoc } from './merge';

export interface SyncSession {
  userId: string;
  email: string;
}

/** What the sync engine needs from a server. Supabase in the app; a fake in tests. */
export interface SyncBackend {
  getSession(): Promise<SyncSession | null>;
  onAuthChange(cb: (session: SyncSession | null) => void): void;
  signIn(email: string, password: string): Promise<void>;
  /** 'confirm-email' when the project requires clicking a confirmation link first. */
  signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'>;
  signOut(): Promise<void>;
  load(userId: string): Promise<SyncDoc | null>;
  save(userId: string, doc: SyncDoc): Promise<void>;
}

const TABLE = 'forge_data';

export async function createSupabaseBackend(url: string, key: string): Promise<SyncBackend> {
  // Loaded on demand so people who never sign in don't download the client.
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'forge-auth' },
  });
  const toSession = (u: { id: string; email?: string } | null | undefined): SyncSession | null => (u ? { userId: u.id, email: u.email ?? '' } : null);

  return {
    async getSession() {
      const { data } = await client.auth.getSession();
      return toSession(data.session?.user);
    },
    onAuthChange(cb) {
      client.auth.onAuthStateChange((_event, session) => cb(toSession(session?.user)));
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
      return data.session ? 'signed-in' : 'confirm-email';
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    async load(userId) {
      const { data, error } = await client.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return (data?.data as SyncDoc | undefined) ?? null;
    },
    async save(userId, doc) {
      const { error } = await client.from(TABLE).upsert({ user_id: userId, data: doc, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}
