import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBackup, parseBackup } from '../lib/backup';
import { parseCount, parseStepsText, recentSteps, stepsOn } from '../lib/steps';
import { useStore } from '../store/useStore';
import { NOW } from './helpers';

// NOW is Wednesday 21 Oct 2026, noon local time.
describe('parseStepsText', () => {
  it('reads the Shortcut output: ISO dates with a time zone', () => {
    const text = '2026-10-19T00:00:00-07:00 10432\n2026-10-20T00:00:00-07:00 8,120\n2026-10-21T00:00:00-07:00 3605.0';
    const local = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const out = parseStepsText(text, NOW + 86_400_000);
    expect(out.map((e) => e.count)).toEqual([10432, 8120, 3605]);
    expect(out[0].date).toBe(local('2026-10-19T00:00:00-07:00'));
  });

  it('reads plain dates, written-out dates and bare numbers', () => {
    expect(parseStepsText('2026-10-20 7000', NOW)).toEqual([{ date: '2026-10-20', count: 7000 }]);
    expect(parseStepsText('Oct 20, 2026 at 12:00 AM 7,001', NOW)).toEqual([{ date: '2026-10-20', count: 7001 }]);
    expect(parseStepsText('20 Oct 2026 7.002', NOW)).toEqual([{ date: '2026-10-20', count: 7002 }]);
    expect(parseStepsText('  9876 \n', NOW)).toEqual([{ date: '2026-10-21', count: 9876 }]);
  });

  it('adds up samples on the same day and skips future or invalid days', () => {
    const text = '2026-10-21 1000\n2026-10-21 2500\n2026-10-22 4000\n2026-02-30 5000\nhello';
    expect(parseStepsText(text, NOW)).toEqual([{ date: '2026-10-21', count: 3500 }]);
  });

  it('finds nothing in unrelated text', () => {
    expect(parseStepsText('', NOW)).toEqual([]);
    expect(parseStepsText('https://example.com\nsee you at 5', NOW)).toEqual([]);
  });

  it('parses counts with separators', () => {
    expect(['12,345', '12.345', '12 345', '12345.6', '1,234,567'].map(parseCount)).toEqual([12345, 12345, 12345, 12346, null]);
  });
});

describe('steps in the store', () => {
  beforeEach(() => useStore.getState().resetAll());
  afterEach(() => vi.useRealTimers());

  it('saves, replaces and deletes days', () => {
    const s = useStore.getState();
    s.saveSteps([{ date: '2026-10-21', count: 4000 }, { date: '2026-10-20', count: 9000 }], 'health');
    s.saveSteps([{ date: '2026-10-21', count: 6000 }], 'health');
    const { steps } = useStore.getState();
    expect(steps.map((e) => [e.date, e.count])).toEqual([
      ['2026-10-20', 9000],
      ['2026-10-21', 6000],
    ]);
    expect(stepsOn(steps, NOW)).toBe(6000);
    expect(recentSteps(steps, 3, NOW).map((d) => d.count)).toEqual([0, 9000, 6000]);

    s.deleteSteps('2026-10-20');
    expect(useStore.getState().steps).toHaveLength(1);
  });

  it('keeps steps, plans and the step goal in backups', () => {
    const s = useStore.getState();
    s.saveSteps([{ date: '2026-10-21', count: 4000 }], 'manual');
    s.setWeekdayPlan(0, 'r1');
    s.updateSettings({ stepGoal: 8000 });
    const text = JSON.stringify(makeBackup(useStore.getState()));
    s.resetAll();
    s.replaceAll(parseBackup(text));
    const after = useStore.getState();
    expect(after.steps[0].count).toBe(4000);
    expect(after.plans[0].routineId).toBe('r1');
    expect(after.settings.stepGoal).toBe(8000);
  });

  it('adds steps and plans from a backup to what is here', () => {
    // Real edits are never in the same millisecond as an earlier delete; keep the test from racing that.
    let t = Date.now();
    const tick = () => vi.setSystemTime((t += 1000));
    vi.useFakeTimers({ now: t });
    const s = useStore.getState();
    s.saveSteps([{ date: '2026-10-20', count: 9000 }], 'health');
    s.setWeekdayPlan(1, 'r1');
    const text = JSON.stringify(makeBackup(useStore.getState()));
    tick();
    s.resetAll();
    tick();
    s.saveSteps([{ date: '2026-10-21', count: 3000 }], 'manual');
    s.mergeIn(parseBackup(text));
    const after = useStore.getState();
    expect(after.steps.map((e) => e.count)).toEqual([9000, 3000]);
    expect(after.plans.map((p) => p.id)).toEqual(['weekday:1']);
  });
});
