import { GUIDES } from '../data/guides';
import { MUSCLE_LABELS } from '../data/exercises';
import type { Exercise, Muscle } from '../types';
import { BodyMap } from './BodyMap';

/** Primary muscle in the strong colour, supporting muscles in the soft one. */
export function workedFills(exercise: Exercise): Partial<Record<Muscle, string>> {
  const fills: Partial<Record<Muscle, string>> = {};
  for (const m of exercise.secondary) fills[m] = 'var(--map-secondary)';
  fills[exercise.primary] = 'var(--map-primary)';
  return fills;
}

/** Muscles worked (diagram) plus how-to steps and form cues. */
export function ExerciseGuide({ exercise, mapHeight = 220 }: { exercise: Exercise; mapHeight?: number }) {
  const guide = GUIDES[exercise.id];
  const hasMap = exercise.primary !== 'cardio' || exercise.secondary.length > 0;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {hasMap && (
        <div className="card">
          <BodyMap
            values={{}}
            fills={workedFills(exercise)}
            height={mapHeight}
            label={`Muscles worked. Primary: ${MUSCLE_LABELS[exercise.primary]}${exercise.secondary.length ? `. Secondary: ${exercise.secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}` : ''}`}
          />
          <div className="legend" style={{ marginTop: 12 }}>
            <span>
              <span className="swatch" style={{ background: 'var(--map-primary)' }} />
              Primary: {MUSCLE_LABELS[exercise.primary]}
            </span>
            {exercise.secondary.length > 0 && (
              <span>
                <span className="swatch" style={{ background: 'var(--map-secondary)' }} />
                Secondary: {exercise.secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
      {guide ? (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>How to</h3>
          <ol className="steps">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="divider" />
          <h3 style={{ marginBottom: 8 }}>Form cues</h3>
          <ul className="cues">
            {guide.cues.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : (
        exercise.custom && <p className="small muted">Custom exercise: no guide available.</p>
      )}
    </div>
  );
}
