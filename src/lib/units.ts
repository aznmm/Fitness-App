import type { Unit } from '../types';
import { LIMITS } from './limits';

export const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;

export function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

/**
 * A typed decimal: "62.5", "62,5", "62." or ".5". Anything else ("1e3",
 * "0x0A", "12kg") is rejected rather than read as some other number.
 */
export function parseDecimal(input: string): number | undefined {
  const s = input.trim().replace(',', '.');
  return /^\d*\.?\d*$/.test(s) && /\d/.test(s) ? Number(s) : undefined;
}

/** A typed whole number, digits only. */
export function parseWholeNumber(input: string): number | undefined {
  const s = input.trim();
  return /^\d+$/.test(s) ? Number(s) : undefined;
}

/** Trim to at most `decimals` places without trailing zeros: 61.50 → "61.5", 135.0 → "135". */
export function trimNumber(n: number, decimals = 1): string {
  const f = 10 ** decimals;
  return String(Math.round(n * f) / f);
}

export function formatWeight(kg: number | undefined, unit: Unit, withUnit = true): string {
  if (kg === undefined || Number.isNaN(kg)) return '—';
  const v = trimNumber(fromKg(kg, unit));
  return withUnit ? `${v} ${unit}` : v;
}

/** Large totals such as weekly volume: 12,450 lb or 12.5k lb. */
export function formatVolume(kg: number, unit: Unit, compact = false): string {
  const v = fromKg(kg, unit);
  if (compact && v >= 10000) return `${trimNumber(v / 1000, 1)}k ${unit}`;
  return `${Math.round(v).toLocaleString()} ${unit}`;
}

export function distanceUnit(unit: Unit): 'mi' | 'km' {
  return unit === 'lb' ? 'mi' : 'km';
}

export function toMetres(value: number, unit: Unit): number {
  return unit === 'lb' ? value * M_PER_MI : value * 1000;
}

export function fromMetres(m: number, unit: Unit): number {
  return unit === 'lb' ? m / M_PER_MI : m / 1000;
}

export function formatDistance(m: number | undefined, unit: Unit): string {
  if (m === undefined) return '—';
  return `${trimNumber(fromMetres(m, unit), 2)} ${distanceUnit(unit)}`;
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatDuration(totalSec: number | undefined): string {
  if (totalSec === undefined || Number.isNaN(totalSec)) return '—';
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "1h 5m", "42m", "30s" — for workout lengths. */
export function formatElapsed(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return `${Math.max(0, Math.floor(ms / 1000))}s`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Parse a duration into seconds. Accepts "1:30" / "1:02:05", or bare digits
 * typed on a number pad, read right-to-left like a microwave: "45" → 0:45,
 * "130" → 1:30, "3000" → 30:00.
 */
export function parseDuration(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  let parts: number[];
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length <= 2) return Number(trimmed);
    parts = [Number(trimmed.slice(0, -2)), Number(trimmed.slice(-2))];
  } else {
    if (!/^\d+(:\d{1,2}){1,2}$/.test(trimmed)) return undefined;
    parts = trimmed.split(':').map(Number);
  }
  // Minutes and seconds after the first part stop at 59 ("1:75" is a typo).
  if (parts.slice(1).some((p) => p > 59)) return undefined;
  const sec = parts.reduce((acc, p) => acc * 60 + p, 0);
  return sec <= LIMITS.durationSec ? sec : undefined;
}
