import type { Muscle } from '../types';

/**
 * Front/back anatomy diagram. Each muscle is a set of shapes drawn for the
 * figure's left side and mirrored. Neutral parts (head, hands, joints) give
 * the silhouette; muscles are filled by intensity (0–1).
 */

type Region = { muscle: Muscle; d: string };

// Coordinates are for one 200×440 figure; the right side is mirrored at x=100.
const FRONT: Region[] = [
  { muscle: 'shoulders', d: 'M83 71 C70 68 55 72 48 84 C43 94 43 106 46 117 C52 113 58 105 62 97 C66 89 72 81 84 77 Z' },
  { muscle: 'chest', d: 'M99 79 L99 122 C91 128 77 127 69 119 C63 111 63 97 67 88 C73 80 86 76 99 79 Z' },
  { muscle: 'biceps', d: 'M47 121 C44 133 42 148 44 161 C48 167 56 165 60 157 C62 145 62 132 60 120 C56 117 50 117 47 121 Z' },
  { muscle: 'forearms', d: 'M43 166 C39 180 35 199 35 214 C37 220 43 220 45 216 C50 202 56 185 58 165 C54 170 48 170 43 166 Z' },
  { muscle: 'abs', d: 'M87 131 h11 v18 h-11 a3 3 0 0 1 -3 -3 v-12 a3 3 0 0 1 3 -3 Z' },
  { muscle: 'abs', d: 'M87 152 h11 v18 h-11 a3 3 0 0 1 -3 -3 v-12 a3 3 0 0 1 3 -3 Z' },
  { muscle: 'abs', d: 'M88 173 h10 v24 c-4 0 -8 -2 -10 -6 a3 3 0 0 1 -1 -2 v-13 a3 3 0 0 1 1 -3 Z' },
  { muscle: 'abs', d: 'M69 125 C75 130 80 131 82 134 L82 194 C77 197 72 195 69 188 C65 168 65 146 69 125 Z' },
  { muscle: 'quads', d: 'M69 222 C62 250 60 284 64 313 C68 325 78 329 86 321 C92 299 96 267 98 236 C90 230 79 226 69 222 Z' },
  { muscle: 'calves', d: 'M68 346 C64 368 64 394 68 412 C72 418 79 418 81 412 C85 393 87 370 85 346 C79 350 73 350 68 346 Z' },
];

const BACK: Region[] = [
  { muscle: 'traps', d: 'M99 58 C92 62 84 67 72 73 C81 81 91 95 99 112 Z' },
  { muscle: 'shoulders', d: 'M70 74 C60 72 50 77 46 88 C43 98 44 108 46 117 C52 113 58 105 62 97 C64 89 67 81 75 79 Z' },
  { muscle: 'lats', d: 'M72 92 C66 116 69 148 81 174 C87 168 94 158 99 148 L99 120 C91 113 81 100 72 92 Z' },
  { muscle: 'back', d: 'M89 152 C86 170 86 186 90 200 L99 202 L99 142 C96 146 92 150 89 152 Z' },
  { muscle: 'triceps', d: 'M47 121 C44 133 42 148 44 161 C48 167 56 165 60 157 C62 145 62 132 60 120 C56 117 50 117 47 121 Z' },
  { muscle: 'forearms', d: 'M43 166 C39 180 35 199 35 214 C37 220 43 220 45 216 C50 202 56 185 58 165 C54 170 48 170 43 166 Z' },
  { muscle: 'glutes', d: 'M99 204 C87 202 72 205 68 218 C66 233 72 246 86 248 C94 248 99 242 99 236 Z' },
  { muscle: 'hamstrings', d: 'M68 252 C64 277 64 300 68 321 C74 329 82 329 88 321 C94 300 96 277 97 254 C87 256 76 256 68 252 Z' },
  { muscle: 'calves', d: 'M68 346 C61 362 61 381 67 396 C73 401 81 399 85 391 C89 375 88 359 84 346 C78 350 73 350 68 346 Z' },
];

/** Neutral body parts that complete the silhouette. */
const SILHOUETTE = [
  'M100 6 C88 6 81 16 81 30 C81 44 89 55 100 55 Z', // head
  'M91 50 L99 50 L99 70 L86 70 C89 64 91 58 91 50 Z', // neck
  'M38 220 C32 226 31 238 36 244 C41 246 46 240 47 230 C47 224 44 219 38 220 Z', // hand
  'M68 200 C67 210 68 218 70 222 C80 226 90 230 99 234 L99 200 Z', // hip
  'M67 324 C64 332 65 341 68 346 C74 350 80 350 85 346 C88 338 88 330 86 322 C80 328 72 328 67 324 Z', // knee
  'M67 414 C62 420 62 428 70 430 L84 430 C86 424 84 418 81 414 Z', // foot
];

const BACK_SILHOUETTE = [
  'M100 6 C88 6 81 16 81 30 C81 44 89 55 100 55 Z',
  'M91 50 L99 50 L99 58 C94 62 90 64 86 66 C89 62 91 56 91 50 Z',
  'M38 220 C32 226 31 238 36 244 C41 246 46 240 47 230 C47 224 44 219 38 220 Z',
  'M67 324 C64 332 65 341 68 346 C74 350 80 350 85 346 C88 338 88 330 86 322 C80 328 72 328 67 324 Z',
  'M67 398 C62 412 62 426 70 430 L84 430 C86 420 86 408 84 394 Z',
  'M70 176 C74 186 80 196 89 200 L89 152 C84 160 78 168 70 176 Z',
];

/** Heat-scale step (1–4) for an intensity, or 0 for none. */
export function heatStep(v: number): 0 | 1 | 2 | 3 | 4 {
  if (!(v > 0)) return 0;
  return v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : 4;
}

export const heatColor = (step: number) => `var(--heat-${step})`;

interface Props {
  /** Intensity per muscle, 0–1, drawn on the heat scale. Missing muscles render neutral. */
  values: Partial<Record<Muscle, number>>;
  /** Explicit colour per muscle; overrides `values` for those muscles. */
  fills?: Partial<Record<Muscle, string>>;
  height?: number;
  label: string;
  /** Show "Front"/"Back" captions. */
  captions?: boolean;
}

export function BodyMap({ values, fills, height = 260, label, captions = true }: Props) {
  return (
    <div className="body-map" role="img" aria-label={label}>
      <Figure regions={FRONT} silhouette={SILHOUETTE} values={values} fills={fills} height={height} caption={captions ? 'Front' : undefined} />
      <Figure regions={BACK} silhouette={BACK_SILHOUETTE} values={values} fills={fills} height={height} caption={captions ? 'Back' : undefined} />
    </div>
  );
}

function Figure({
  regions,
  silhouette,
  values,
  fills,
  height,
  caption,
}: {
  regions: Region[];
  silhouette: string[];
  values: Partial<Record<Muscle, number>>;
  fills?: Partial<Record<Muscle, string>>;
  height: number;
  caption?: string;
}) {
  const side = (mirror: boolean) => (
    <g transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
      {silhouette.map((d, i) => (
        <path key={`s${i}`} d={d} className="bm-neutral" />
      ))}
      {regions.map((r, i) => {
        const step = heatStep(values[r.muscle] ?? 0);
        const fill = fills?.[r.muscle] ?? (step ? heatColor(step) : undefined);
        return (
          <g key={i}>
            <path d={r.d} className="bm-muscle" />
            {fill && <path d={r.d} fill={fill} />}
          </g>
        );
      })}
    </g>
  );
  return (
    <figure className="bm-figure">
      <svg viewBox="28 0 144 436" height={height} aria-hidden>
        {side(false)}
        {side(true)}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** "Less ▮▮▮▮ More" key for the heat scale, with an optional neutral swatch. */
export function HeatLegend({ low, high, none }: { low: string; high: string; none?: string }) {
  return (
    <div className="legend heat-legend">
      {none && (
        <span>
          <span className="swatch" style={{ background: 'var(--fill-strong)' }} />
          {none}
        </span>
      )}
      <span className="row" style={{ gap: 6 }}>
        {low}
        <span className="heat-steps" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="swatch" style={{ background: heatColor(n), marginRight: 0 }} />
          ))}
        </span>
        {high}
      </span>
    </div>
  );
}
