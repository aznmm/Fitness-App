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
- `src/sync/`: optional Supabase sync (merge-based). Off until `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` are set in `.env.production`; see `docs/sync-setup.md`.
- `src/data/`: exercise library, programs, how-to guides (every built-in exercise needs a guide; a test enforces it).
- `src/styles.css`: design tokens at the top, redefined for light mode in both the `prefers-color-scheme` block and the `[data-theme='light']` block. Add any new token to all three.
