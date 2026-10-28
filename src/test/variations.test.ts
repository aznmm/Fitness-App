import { describe, expect, it } from 'vitest';
import { filterExercises } from '../components/ExercisePicker';
import { BUILT_IN_EXERCISES, variationsOf } from '../data/exercises';
import { matchExercise } from '../lib/importCsv';
import { replaceExercise } from '../lib/workoutOps';
import { NOW, set, workout } from './helpers';

const byId = new Map(BUILT_IN_EXERCISES.map((e) => [e.id, e]));
const ids = (list: { id: string }[]) => list.map((e) => e.id).sort();

describe('exercise variations', () => {
  it('links every variation to a base exercise, one level deep', () => {
    for (const e of BUILT_IN_EXERCISES.filter((x) => x.variantOf)) {
      const base = byId.get(e.variantOf!);
      expect(base, `${e.id} → ${e.variantOf}`).toBeDefined();
      expect(base!.variantOf, `${e.variantOf} is itself a variation`).toBeUndefined();
    }
    // Loaded and bodyweight versions log differently; only a few pairs should.
    const mixed = BUILT_IN_EXERCISES.filter((e) => e.variantOf && byId.get(e.variantOf)!.type !== e.type).map((e) => e.id);
    expect(mixed.sort()).toEqual(['back-extension-machine', 'smith-glute-bridge']);
  });

  it('finds the whole family from any member', () => {
    expect(ids(variationsOf(byId.get('lat-pulldown')!, BUILT_IN_EXERCISES))).toEqual(
      ['close-grip-pulldown', 'lat-pulldown-reverse', 'lat-pulldown-wide', 'machine-lat-pulldown', 'single-arm-pulldown'].sort(),
    );
    const fromWide = ids(variationsOf(byId.get('lat-pulldown-wide')!, BUILT_IN_EXERCISES));
    expect(fromWide).toContain('lat-pulldown');
    expect(fromWide).not.toContain('lat-pulldown-wide');
    expect(ids(variationsOf(byId.get('hip-thrust')!, BUILT_IN_EXERCISES))).toEqual(['hip-thrust-machine', 'smith-hip-thrust']);
    expect(variationsOf(byId.get('plank')!, BUILT_IN_EXERCISES)).toEqual([]);
  });

  it('matches imported grip and Smith machine names to the right version', () => {
    const m = (name: string) => matchExercise(name, BUILT_IN_EXERCISES).exercise?.id;
    expect(m('Lat Pulldown (Cable)')).toBe('lat-pulldown');
    expect(m('Lat Pulldown - Wide Grip (Cable)')).toBe('lat-pulldown-wide');
    expect(m('Lat Pulldown - Underhand (Cable)')).toBe('lat-pulldown-reverse');
    expect(m('Bench Press - Close Grip (Barbell)')).toBe('close-grip-bench');
    expect(m('Bench Press (Barbell)')).toBe('bench-press');
    expect(m('Hip Thrust (Smith Machine)')).toBe('smith-hip-thrust');
    expect(m('Pull Up (Narrow Grip)')).toBe('pull-up-close');
    expect(m('Squat (Smith Machine)')).toBe('smith-squat');
    expect(m('Back Extension')).toBe('back-extension');
    expect(m('Hyperextension')).toBe('back-extension');
    expect(m('Back Extension (Hyperextension)')).toBe('back-extension');
    expect(m('Reverse Hyperextension')).toBe('reverse-hyperextension');
    expect(m('Back Extension (Machine)')).toBe('back-extension-machine');
  });

  it('finds the hyperextension family by searching "hyper"', () => {
    const found = filterExercises(BUILT_IN_EXERCISES, 'hyper', null).map((e) => e.id);
    expect(found).toEqual(expect.arrayContaining(['back-extension', 'glute-hyperextension', 'side-hyperextension', 'reverse-hyperextension']));
  });

  it('keeps entered sets when switching to a variation', () => {
    const w = workout(NOW, { 'bench-press': [set(100, 5)] });
    const we = w.exercises[0];
    const swapped = replaceExercise(we.id, 'smith-bench-press', true)(w).exercises[0];
    expect(swapped.exerciseId).toBe('smith-bench-press');
    expect(swapped.sets[0]).toMatchObject({ weight: 100, reps: 5, done: true });
    expect(replaceExercise(we.id, 'squat')(w).exercises[0].sets[0]).toMatchObject({ weight: undefined, reps: undefined, done: false });
  });
});
