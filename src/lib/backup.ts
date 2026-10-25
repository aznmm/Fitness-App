import type { AppData } from '../store/useStore';
import type { Exercise, Unit } from '../types';
import { formatDuration, fromKg, fromMetres, trimNumber } from './units';

export const BACKUP_FORMAT = 'forge-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: number;
  data: Omit<AppData, 'rest'>;
}

export function makeBackup(data: AppData, now = Date.now()): Backup {
  const { rest: _rest, ...rest } = data;
  return { format: BACKUP_FORMAT, version: 1, exportedAt: now, data: rest };
}

/** Throws with a readable message if the file isn't a backup made by this app. */
export function parseBackup(text: string): Partial<AppData> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const b = raw as Partial<Backup>;
  if (!b || b.format !== BACKUP_FORMAT || typeof b.data !== 'object' || b.data === null) {
    throw new Error('That file is not a Forge backup.');
  }
  const d = b.data as Partial<AppData>;
  const arrays: (keyof AppData)[] = ['workouts', 'routines', 'customExercises', 'bodyweights'];
  for (const key of arrays) {
    if (d[key] !== undefined && !Array.isArray(d[key])) throw new Error(`Backup field "${key}" is malformed.`);
  }
  return {
    workouts: d.workouts ?? [],
    routines: d.routines ?? [],
    customExercises: d.customExercises ?? [],
    bodyweights: d.bodyweights ?? [],
    active: d.active ?? null,
    settings: d.settings,
  };
}

function csvCell(v: string | number | undefined): string {
  if (v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per set — opens cleanly in Excel / Google Sheets. */
export function workoutsToCsv(data: Pick<AppData, 'workouts'>, exercisesById: Map<string, Exercise>, unit: Unit): string {
  const header = ['Date', 'Workout', 'Exercise', 'Set', 'Type', `Weight (${unit})`, 'Reps', 'Duration', `Distance (${unit === 'lb' ? 'mi' : 'km'})`, 'Notes'];
  const rows = [header.join(',')];
  const workouts = [...data.workouts].filter((w) => w.endedAt).sort((a, b) => a.startedAt - b.startedAt);
  for (const w of workouts) {
    const date = new Date(w.startedAt).toISOString();
    for (const we of w.exercises) {
      const name = exercisesById.get(we.exerciseId)?.name ?? we.exerciseId;
      we.sets.forEach((s, i) => {
        rows.push(
          [
            date,
            w.name,
            name,
            i + 1,
            s.kind,
            s.weight !== undefined ? trimNumber(fromKg(s.weight, unit), 2) : undefined,
            s.reps,
            s.duration !== undefined ? formatDuration(s.duration) : undefined,
            s.distance !== undefined ? trimNumber(fromMetres(s.distance, unit), 3) : undefined,
            i === 0 ? we.notes : undefined,
          ]
            .map(csvCell)
            .join(','),
        );
      });
    }
  }
  return rows.join('\n');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
