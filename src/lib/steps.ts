import type { StepEntry } from '../types';
import { startOfDay, toDateInput } from './dates';

/** Name of the iPhone Shortcut that copies steps from Apple Health. */
export const STEPS_SHORTCUT = 'Forge Steps';

export const stepsShortcutUrl = () => `shortcuts://run-shortcut?name=${encodeURIComponent(STEPS_SHORTCUT)}`;

export const stepsId = (date: string) => `steps:${date}`;

/** iPhone or iPad, where the Shortcuts app and Apple Health exist. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const MAX_STEPS = 200_000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function realDate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
}

const ISO = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)\s*(Z|[+-]\d{2}:?\d{2})?)?/;
const MONTH_FIRST = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i;
const DAY_FIRST = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})/i;
const TIME = /\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]\.?M\.?)?/gi;

/** Finds a date in a line; returns the local YYYY-MM-DD and the line without it. */
function takeDate(line: string): { date: string; rest: string } | null {
  const iso = line.match(ISO);
  if (iso) {
    let date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    // With a time zone, convert to the local day (a UTC midnight can be yesterday here).
    if (iso[4] && iso[5]) {
      const zone = iso[5] === 'Z' ? 'Z' : iso[5].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
      const t = Date.parse(`${date}T${iso[4]}${zone}`);
      if (!Number.isNaN(t)) date = toDateInput(t);
    }
    return { date, rest: line.replace(iso[0], ' ') };
  }
  const mf = line.match(MONTH_FIRST);
  if (mf) return { date: ymd(Number(mf[3]), MONTHS.indexOf(mf[1].toLowerCase()) + 1, Number(mf[2])), rest: line.replace(mf[0], ' ') };
  const df = line.match(DAY_FIRST);
  if (df) return { date: ymd(Number(df[3]), MONTHS.indexOf(df[2].toLowerCase()) + 1, Number(df[1])), rest: line.replace(df[0], ' ') };
  return null;
}

/** Reads "8,432", "8.432", "8432.0" or "8 432" as a whole number of steps. */
export function parseCount(raw: string): number | null {
  let s = raw.replace(/[\s  ']/g, '').replace(/[.,]+$/, '');
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Math.round(Number(s));
  return Number.isFinite(n) && n >= 0 && n <= MAX_STEPS ? n : null;
}

function lastCount(text: string): number | null {
  const numbers = text.replace(TIME, ' ').match(/\d[\d,.\s  ']*/g);
  return numbers ? parseCount(numbers[numbers.length - 1].trim()) : null;
}

/**
 * Parses steps copied by the Shortcut: one "date value" line per day, e.g.
 * "2026-10-27T00:00:00-07:00 8432". A bare number counts as today's steps.
 * Several lines for the same day are added up. Future days are ignored.
 */
export function parseStepsText(text: string, now = Date.now()): { date: string; count: number }[] {
  const today = toDateInput(now);
  const totals = new Map<string, number>();
  const lines = text.split(/[\r\n;]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const found = takeDate(line);
    const date = found?.date ?? (lines.length === 1 ? today : null);
    const count = lastCount(found ? found.rest : line);
    if (!date || count === null || date > today || !realDate(date)) continue;
    totals.set(date, (totals.get(date) ?? 0) + count);
  }
  return [...totals].map(([date, count]) => ({ date, count: Math.min(count, MAX_STEPS) })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Steps for the day containing `t`, if logged. */
export function stepsOn(entries: StepEntry[], t: number): number | undefined {
  return entries.find((e) => e.date === toDateInput(t))?.count;
}

/** Daily counts for the `days` days ending today, oldest first (0 when missing). */
export function recentSteps(entries: StepEntry[], days: number, now = Date.now()): { date: number; count: number; logged: boolean }[] {
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  const end = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - (days - 1 - i));
    const count = byDate.get(toDateInput(d.getTime()));
    return { date: d.getTime(), count: count ?? 0, logged: count !== undefined };
  });
}
