import palette from '../data/accents.json';

/** The app's colour: links, buttons, highlights and the barbell in the app icon. */
export type AccentColor = keyof typeof palette;

export interface Accent {
  name: string;
  /** [main, gradient partner] on dark backgrounds. */
  dark: [string, string];
  /** [main, gradient partner] on light backgrounds. */
  light: [string, string];
}

export const ACCENTS = Object.keys(palette) as AccentColor[];
export const DEFAULT_ACCENT: AccentColor = 'blue';

const ALL = palette as unknown as Record<AccentColor, Accent>;

/** The accent for a saved id; unknown ids (an older or damaged setting) fall back to blue. */
export function accentOf(id: string | undefined): Accent {
  return isAccent(id) ? ALL[id] : ALL[DEFAULT_ACCENT];
}

export function isAccent(id: string | undefined): id is AccentColor {
  return !!id && Object.hasOwn(ALL, id);
}

/** The app icon (public/icon.svg) with the barbell in `accent`'s colours. */
export function appIconSvg(accent: Accent): string {
  const [main, partner] = accent.dark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${partner}"/>
      <stop offset="1" stop-color="${main}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <g fill="url(#g)">
    <rect x="92" y="184" width="44" height="144" rx="16"/>
    <rect x="376" y="184" width="44" height="144" rx="16"/>
    <rect x="144" y="140" width="60" height="232" rx="22"/>
    <rect x="308" y="140" width="60" height="232" rx="22"/>
  </g>
  <rect x="204" y="234" width="104" height="44" rx="12" fill="#ffffff"/>
</svg>
`;
}

/** The Home Screen icon iOS saves on "Add to Home Screen" (made by `npm run icons`). */
export function touchIconFile(id: string): string {
  return isAccent(id) && id !== DEFAULT_ACCENT ? `apple-touch-icon-${id}.png` : 'apple-touch-icon.png';
}

/**
 * Recolours the app: the CSS tokens read these variables (see the top of
 * styles.css), the tab's icon is redrawn, and the Home Screen icon points at
 * the matching PNG for the next time the app is added.
 */
export function applyAccent(id: string): void {
  const accent = accentOf(id);
  const style = document.documentElement.style;
  style.setProperty('--accent-dark', accent.dark[0]);
  style.setProperty('--accent-2-dark', accent.dark[1]);
  style.setProperty('--accent-light', accent.light[0]);
  style.setProperty('--accent-2-light', accent.light[1]);
  document.querySelector('link[rel="icon"]')?.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(appIconSvg(accent))}`);
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', `./${touchIconFile(id)}`);
}
