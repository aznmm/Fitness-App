import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GAUGE_MAX, levelProgress } from '../lib/strength';
import { useStrength } from '../lib/useStrength';
import { ScoreRing } from './ScoreRing';

export function ScoreDelta({ change }: { change: number | undefined }) {
  if (change === undefined || Math.round(change) === 0) return null;
  const up = change > 0;
  return (
    <span className={`row small ${up ? 'delta-up' : 'delta-down'}`} style={{ gap: 4, fontWeight: 600 }}>
      {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      <span className="rounded-num">
        {up ? '+' : '−'}
        {Math.abs(Math.round(change))}
      </span>
      <span className="muted" style={{ fontWeight: 500 }}>
        vs 4 wks ago
      </span>
    </span>
  );
}

/** Home-screen summary of the strength score. */
export function StrengthScoreCard() {
  const { current, change, bodyweight } = useStrength();

  if (!bodyweight || current.overall === null) {
    return (
      <Link to="/progress" className="card link">
        <div className="score-card">
          <ScoreRing progress={0} size={92} stroke={11} label="Strength score not available yet">
            <span className="score muted" style={{ fontSize: 26 }}>
              –
            </span>
          </ScoreRing>
          <div className="grow">
            <div className="card-title">Strength score</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              {!bodyweight ? 'Log your bodyweight to unlock it' : 'Finish a workout with a main lift'}
            </div>
            <div className="small muted" style={{ marginTop: 2 }}>
              {!bodyweight ? 'It compares your lifts to your bodyweight.' : 'Bench, squat, deadlift, rows, presses…'}
            </div>
          </div>
          <ChevronRight size={20} className="faint" />
        </div>
      </Link>
    );
  }

  const score = Math.round(current.overall);
  const { level, next } = levelProgress(current.overall);

  return (
    <Link to="/progress" className="card link">
      <div className="score-card">
        <ScoreRing progress={current.overall / GAUGE_MAX} label={`Strength score ${score}, ${level.name}`}>
          <div>
            <div className="score" style={{ fontSize: 38 }}>
              {score}
            </div>
            <div className="tiny muted" style={{ fontWeight: 600, marginTop: 2 }}>
              SCORE
            </div>
          </div>
        </ScoreRing>
        <div className="grow">
          <div className="spread">
            <div className="card-title">Strength</div>
            <ChevronRight size={20} className="faint" />
          </div>
          <div className="level-name" style={{ marginTop: 2 }}>
            {level.name}
          </div>
          <ScoreDelta change={change} />
          <div className="small muted" style={{ marginTop: 8 }}>
            {next ? (
              <>
                <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {next.min - score}
                </span>{' '}
                to {next.name}
              </>
            ) : (
              'Top level reached'
            )}
          </div>
        </div>
      </div>
      {current.trainedGroups < 5 && (
        <div className="tiny muted" style={{ marginTop: 12 }}>
          Based on {current.trainedGroups} of 5 muscle groups — train them all for a complete score.
        </div>
      )}
    </Link>
  );
}
