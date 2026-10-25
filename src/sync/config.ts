/**
 * Supabase project for cloud sync. These values are public by design (the
 * "anon"/publishable key only allows what the database's row-level security
 * permits), so they live in `.env.production` in the repo. Never put the
 * service_role / secret key here.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';
export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
