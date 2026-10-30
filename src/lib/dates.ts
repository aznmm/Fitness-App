export const DAY_MS = 86_400_000;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Weeks start on Monday. */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export function addDays(t: number, days: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + months, 1).getTime();
}

export function sameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function formatDate(t: number, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Date(t).toLocaleDateString(undefined, opts);
}

export function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today", "Yesterday", "Mon, Oct 20" or "Oct 20, 2025" for other years. */
export function relativeDay(t: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  if (diff > 1 && diff < 7) return formatDate(t, { weekday: 'long' });
  return sameYear
    ? formatDate(t, { weekday: 'short', month: 'short', day: 'numeric' })
    : formatDate(t, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Compact relative day for tight rows: "today", "yesterday", "Monday", "Oct 19". */
export function shortDay(t: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / DAY_MS);
  if (diff >= 0 && diff < 7) return relativeDayInline(t, now);
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  return formatDate(t, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

/** relativeDay for use mid-sentence: "last done today", "last done Monday". */
export function relativeDayInline(t: number, now = Date.now()): string {
  return relativeDay(t, now).replace(/^(Today|Yesterday)$/, (m) => m.toLowerCase());
}

export function greeting(now = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Default name for a workout started without a routine. */
export function defaultWorkoutName(now = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'Night Workout';
  if (h < 12) return 'Morning Workout';
  if (h < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

/** Value for <input type="date">. */
export function toDateInput(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateInput(v: string): number {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}
