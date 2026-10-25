import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { levelProgress } from '../lib/strength';
import { useStrength } from '../lib/useStrength';

export function ScoreDelta({ change }: { change: number | undefined }) {
  if (change === undefined || Math.round(change) === 0) return null;
  const up = change > 0;
  return (
    <span className={`row small ${up ? 'delta-up' : 'delta-down'}`} style={{ gap: 4, fontWeight: 650 }}>
      {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      {up ? '+' : '−'}
      {Math.abs(Math.round(change))} vs 4 wks ago
    </span>
  );
}

/** Home-screen summary of the strength score. */
export function StrengthScoreCard() {
  const { current, change, bodyweight } = useStrength();

  if (!bodyweight) {
    return (
      <Link to="/progress" className="card link">
        <div className="spread">
          <div>
            <div className="small muted" style={{ fontWeight: 650 }}>
              Strength score
            </div>
            <div style={{ fontWeight: 650, marginTop: 4 }}>Log your bodyweight to unlock it</div>
          </div>
          <ChevronRight className="muted" />
        </div>
      </Link>
    );
  }

  if (current.overall === null) {
    return (
      <Link to="/progress" className="card link">
        <div className="small muted" style={{ fontWeight: 650 }}>
          Strength score
        </div>
        <div style={{ fontWeight: 650, marginTop: 4 }}>Finish a workout with a main lift to get your score</div>
        <div className="small muted" style={{ marginTop: 4 }}>
          e.g. bench press, squat, deadlift, rows, overhead press
        </div>
      </Link>
    );
  }

  const score = Math.round(current.overall);
  const { level, next, progress } = levelProgress(current.overall);

  return (
    <Link to="/progress" className="card link">
      <div className="spread">
        <div className="small muted" style={{ fontWeight: 650 }}>
          Strength score
        </div>
        <ChevronRight size={18} className="muted" />
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 12, marginTop: 6 }}>
        <div className="hero-number">{score}</div>
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>{level.name}</div>
          <ScoreDelta change={change} />
        </div>
      </div>
      <div className="meter" style={{ marginTop: 14 }} aria-hidden>
        <div style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="spread tiny muted" style={{ marginTop: 6 }}>
        <span>{level.name}</span>
        <span>{next ? `${next.min - score} to ${next.name}` : 'Top level'}</span>
      </div>
      {current.trainedGroups < 5 && (
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Based on {current.trainedGroups} of 5 muscle groups — train them all for a complete score.
        </div>
      )}
    </Link>
  );
}
