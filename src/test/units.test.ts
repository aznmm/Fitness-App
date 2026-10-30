import { describe, expect, it } from 'vitest';
import { formatDuration, formatWeight, fromKg, parseDecimal, parseDuration, parseWholeNumber, toKg, trimNumber } from '../lib/units';

describe('units', () => {
  it('round-trips pounds through kilograms', () => {
    expect(fromKg(toKg(135, 'lb'), 'lb')).toBeCloseTo(135, 9);
    expect(formatWeight(toKg(225, 'lb'), 'lb')).toBe('225 lb');
    expect(formatWeight(100, 'kg')).toBe('100 kg');
  });

  it('trims trailing zeros', () => {
    expect(trimNumber(61.5)).toBe('61.5');
    expect(trimNumber(135.0)).toBe('135');
    expect(trimNumber(2.25, 2)).toBe('2.25');
  });

  it('formats durations', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(5)).toBe('0:05');
  });

  it('parses colon and number-pad durations', () => {
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('1:02:05')).toBe(3725);
    expect(parseDuration('45')).toBe(45);
    expect(parseDuration('130')).toBe(90);
    expect(parseDuration('3000')).toBe(1800);
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('a:b')).toBeUndefined();
  });

  it('rejects typos instead of reading them as other numbers', () => {
    expect(parseDuration('1:75')).toBeUndefined();
    expect(parseDuration('160')).toBeUndefined();
    expect(parseDuration('99:99')).toBeUndefined();
    expect(parseDuration('25:00:00')).toBeUndefined();
    expect(parseDecimal('62,5')).toBe(62.5);
    expect(parseDecimal('62.')).toBe(62);
    expect(parseDecimal('1e3')).toBeUndefined();
    expect(parseDecimal('0x0A')).toBeUndefined();
    expect(parseDecimal('-5')).toBeUndefined();
    expect(parseDecimal('.')).toBeUndefined();
    expect(parseWholeNumber('12')).toBe(12);
    expect(parseWholeNumber('1.5')).toBeUndefined();
    expect(parseWholeNumber('0x0A')).toBeUndefined();
  });
});
