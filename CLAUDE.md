# Forge: notes for Claude

## Owner's standing instructions

- **Always ship finished work without asking.** After committing to the work branch: open a pull request to `main`, wait for CI to pass, merge it, then confirm the "Deploy to GitHub Pages" run succeeded and the site at https://aznmm.github.io/Fitness-App/ updated. Don't wait for a go-ahead. If CI fails, fix it and push before merging. Never merge red.
- The repo is **public**: never commit personal data (workout exports, Caliber/Strong CSVs, emails, secrets). Supabase config may only contain the project URL and the publishable/anon key, never the service_role/secret key.

## Project

Mobile-first workout tracker PWA (Caliber-inspired). React 19 + TypeScript + Vite, Zustand persisted to IndexedDB, hash routing, `vite-plugin-pwa`. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # typecheck + production build
npm run dev         # http://localhost:5173
```

Run typecheck, tests and build before pushing. For UI changes, also check the app in a phone-sized headless Chromium (Playwright is preinstalled), in both light and dark mode.

## Layout

- `src/lib/`: pure logic (1RM/PRs, strength score, progression, muscles/recovery, stats, CSV import, units, dates). Unit-tested in `src/test/`.
- `src/store/useStore.ts`: app state. Records carry `updatedAt` and deletes add tombstones to `deleted`; both are needed for sync merging.
- Day plans (`plans`) and steps (`steps`) are synced records with fixed ids (`date:YYYY-MM-DD`, `weekday:N`, `steps:YYYY-MM-DD`); a record saved after its tombstone wins, so a re-planned day comes back. Logic in `src/lib/plans.ts` and `src/lib/steps.ts`.
- Apple Health steps arrive through the "Forge Steps" iPhone Shortcut (clipboard); see `docs/steps-shortcut.md`. A web app can't read HealthKit directly.
- `settings.tickMode`: `'set'` (default) shows a ✓ per set and starts rest on each tick; `'exercise'` hides them for one Done button per exercise and starts rest when a set is first entered. Sets count when ticked. Unticked sets with numbers entered are saved as done only if the user chooses so on Finish (`pruneIncomplete(w, true)`); backfilled past workouts always keep them. Values get pre-filled in several places (Use target, warm-ups, Add set), so "has numbers" alone doesn't mean "done".
- Assisted machines (`assisted: true`, type `reps`) store assistance as negative added weight; cardio (`primary: 'cardio'`) uses `metric`/`distanceScale` and `src/lib/cardio.ts` for pace, speed and splits.
- Anything read from outside (backup files, the cloud copy, saved state on load) goes through `cleanData` in `src/lib/sanitize.ts`, so damaged records are repaired or dropped instead of crashing screens. Number inputs and CSV import stop at `src/lib/limits.ts`. Open tabs reload saved state when another tab writes (`onOtherTabWrite` in `src/store/storage.ts`), so a stale tab can't overwrite newer data.
- `src/sync/`: optional Supabase sync (merge-based). Off until `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` are set in `.env.production`; see `docs/sync-setup.md`.
- `src/data/`: exercise library, programs, how-to guides (every built-in exercise needs a guide; a test enforces it). Grip/stance/Smith versions set `variantOf` to a base exercise (one level, no chains; tested); name grip versions "Base (Wide Grip)" so they sort next to the base.
- Back buttons name the screen they return to ("‹ Routines"): `PageHeader` records its title per history entry (`backTitle` overrides it); screens without one call `useBackTitle`. Top-bar actions are plain tinted icons (`.navbar .glass-btn`); round buttons in content are one 30px size. Delete actions live in ⋯ menus or as a red button at the bottom of the page, not in the top bar.
- App colour: `settings.accent` is an id from `src/data/accents.json`. `applyAccent` (`src/lib/accents.ts`) sets `--accent-dark/-light` (and `--accent-2-…`), which the `--accent` tokens read, and swaps the tab icon and `apple-touch-icon`. After adding a colour, run `npm run icons` to render its `public/apple-touch-icon-<id>.png` (a test checks each colour has one).
- `src/styles.css`: design tokens at the top, redefined for light mode in both the `prefers-color-scheme` block and the `[data-theme='light']` block. Add any new token to all three.
