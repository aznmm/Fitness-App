# Setting up cloud sync (Supabase)

Forge can back up your data and sync it between devices using a free [Supabase](https://supabase.com) project. Setup takes about 5 minutes and is done once.

## 1. Create a project

1. Sign up at [supabase.com](https://supabase.com) (the free plan is plenty).
2. Click **New project**. Pick any name (e.g. `forge`), set a database password (save it somewhere, you won't need it day to day), and choose the region closest to you.
3. Wait a minute for the project to finish setting up.

## 2. Create the sync table

Open **SQL Editor** → **New query**, paste this, and click **Run**:

```sql
create table if not exists public.forge_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.forge_data enable row level security;

create policy "Read own data" on public.forge_data
  for select using ((select auth.uid()) = user_id);
create policy "Insert own data" on public.forge_data
  for insert with check ((select auth.uid()) = user_id);
create policy "Update own data" on public.forge_data
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own data" on public.forge_data
  for delete using ((select auth.uid()) = user_id);
```

Row level security means each account can only ever read or write its own row.

## 3. Point sign-up emails at the app

**Authentication → URL Configuration**: set **Site URL** to `https://aznmm.github.io/Fitness-App/`.

New accounts get a confirmation email by default. If you'd rather skip that step, turn off **Confirm email** under **Authentication → Sign In / Providers → Email**.

## 4. Connect the app

Under **Project Settings → API Keys** (or **Data API**), copy:

- the **Project URL**, which looks like `https://abcdefgh.supabase.co`
- the **publishable** key (`sb_publishable_…`) or, on older projects, the **anon public** key

Both are safe to publish: the key only allows what the security policies above permit. **Never share the `service_role` / secret key.**

Put them in `.env.production` at the root of the repo:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_KEY=sb_publishable_...
```

Merge to `main` and the deploy picks them up. In the app, open **Settings → Account & sync → Sign in to sync** and create your account. Do the same sign-in on your other devices.

## How syncing works

- Changes upload a few seconds after you make them, and the app checks for changes from other devices when you open it.
- Data from each device is **merged**, not overwritten: workouts, routines, custom exercises and bodyweight entries are combined by ID, and the most recent edit of each wins.
- Deletes sync too, so a workout deleted on your phone disappears from your laptop.
- The workout you're currently doing stays on that device until you finish it.
