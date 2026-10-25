import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { restFinishedAlert } from '../lib/feedback';
import { formatDuration } from '../lib/units';
import { useNow } from '../lib/useNow';
import { useStore } from '../store/useStore';

const R = 17;
const C = 2 * Math.PI * R;

/** Countdown shown on every screen while resting between sets, styled like a Live Activity. */
export function RestTimerBar() {
  const rest = useStore((s) => s.rest);
  const adjustRest = useStore((s) => s.adjustRest);
  const stopRest = useStore((s) => s.stopRest);
  const sound = useStore((s) => s.settings.restSound);
  const now = useNow(250, !!rest);
  const { pathname } = useLocation();

  const remaining = rest ? Math.min(rest.totalSec, Math.max(0, (rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && rest.endsAt <= now) {
      stopRest();
      restFinishedAlert(sound);
    }
  }, [rest, now, stopRest, sound]);

  if (!rest || remaining <= 0) return null;
  const onWorkout = pathname === '/workout';
  const fraction = remaining / rest.totalSec;

  return (
    <div className={`floating rest-bar${onWorkout ? '' : ' with-tabs'}`} role="timer" aria-label="Rest timer">
      <svg width={44} height={44} viewBox="0 0 44 44" aria-hidden style={{ flex: 'none', transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={R} fill="none" stroke="var(--accent)" strokeOpacity={0.3} strokeWidth={5} />
        <circle
          cx={22}
          cy={22}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div className="grow">
        <div className="label">Rest</div>
        <div className="time">{formatDuration(Math.ceil(remaining))}</div>
      </div>
      <button className="pill" onClick={() => adjustRest(-15)} aria-label="Subtract 15 seconds">
        −15
      </button>
      <button className="pill" onClick={() => adjustRest(15)} aria-label="Add 15 seconds">
        +15
      </button>
      <button className="pill primary" onClick={stopRest}>
        Skip
      </button>
    </div>
  );
}
