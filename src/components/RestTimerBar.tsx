import { Timer } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { restFinishedAlert } from '../lib/feedback';
import { formatDuration } from '../lib/units';
import { useNow } from '../lib/useNow';
import { useStore } from '../store/useStore';

/** Countdown shown on every screen while resting between sets. */
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
  const pct = Math.min(100, (remaining / rest.totalSec) * 100);

  return (
    <div className={`floating rest-bar${onWorkout ? '' : ' with-tabs'}`} role="timer" aria-label="Rest timer">
      <div className="row">
        <Timer size={22} className="muted" />
        <div className="time tabular">{formatDuration(Math.ceil(remaining))}</div>
        <div className="grow" />
        <button className="btn btn-sm" onClick={() => adjustRest(-15)}>
          −15s
        </button>
        <button className="btn btn-sm" onClick={() => adjustRest(15)}>
          +15s
        </button>
        <button className="btn btn-sm btn-primary" onClick={stopRest}>
          Skip
        </button>
      </div>
      <div className="meter" aria-hidden>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
