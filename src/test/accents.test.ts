import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACCENTS, DEFAULT_ACCENT, accentOf, appIconSvg, isAccent, touchIconFile } from '../lib/accents';
import { useStore } from '../store/useStore';
import type { Settings } from '../types';

const pub = join(__dirname, '..', '..', 'public');

describe('accent colours', () => {
  it('draws the same icon as public/icon.svg in the default colour', () => {
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(squash(appIconSvg(accentOf(DEFAULT_ACCENT)))).toBe(squash(readFileSync(join(pub, 'icon.svg'), 'utf8')));
  });

  it('has a Home Screen icon for every colour (run `npm run icons` after adding one)', () => {
    for (const id of ACCENTS) expect(existsSync(join(pub, touchIconFile(id))), id).toBe(true);
  });

  it('falls back to blue for unknown or odd ids', () => {
    expect(accentOf('nope')).toBe(accentOf('blue'));
    expect(accentOf('toString')).toBe(accentOf('blue'));
    expect(isAccent('constructor')).toBe(false);
    expect(touchIconFile('toString')).toBe('apple-touch-icon.png');
    expect(touchIconFile('teal')).toBe('apple-touch-icon-teal.png');
  });

  it('starts blue and older saved settings pick that up', () => {
    useStore.getState().resetAll();
    expect(useStore.getState().settings.accent).toBe('blue');
    const { accent: _a, ...old } = useStore.getState().settings;
    useStore.getState().replaceAll({ settings: old as Settings });
    expect(useStore.getState().settings.accent).toBe('blue');
  });
});
