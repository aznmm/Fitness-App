import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { primeAudio, restFinishedAlert } from '../lib/feedback';
import { formatDuration } from '../lib/units';
import { useNow } from '../lib/useNow';
import { useStore } from '../store/useStore';
import { Sheet } from './Sheet';

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

const QUICK_REST = [30, 60, 90, 120, 180, 300];

/** Start a rest by hand, and choose whether one starts by itself after each set. */
export function RestSheet({ onClose }: { onClose: () => void }) {
  const rest = useStore((s) => s.rest);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const startRest = useStore((s) => s.startRest);
  const stopRest = useStore((s) => s.stopRest);

  return (
    <Sheet title="Rest timer" onClose={onClose}>
      {rest && (
        <button
          className="btn btn-plain-danger btn-block"
          style={{ marginBottom: 12 }}
          onClick={() => {
            stopRest();
            onClose();
          }}
        >
          Stop the current rest
        </button>
      )}
      <div className="list-header">Start a rest now</div>
      <div className="rest-grid">
        {QUICK_REST.map((sec) => (
          <button
            key={sec}
            className={`btn ${sec === settings.defaultRestSec ? 'btn-primary' : 'btn-tinted'}`}
            onClick={() => {
              primeAudio();
              startRest(sec);
              onClose();
            }}
          >
            {formatDuration(sec)}
          </button>
        ))}
      </div>

      <div className="list" style={{ marginTop: 24 }}>
        <label className="list-item">
          <span className="grow">
            <span className="title" style={{ display: 'block' }}>
              Start after each set
            </span>
            <span className="sub">When you enter a set's reps or time, or tick an exercise</span>
          </span>
          <span className="switch">
            <input type="checkbox" checked={settings.autoRestTimer} onChange={(e) => updateSettings({ autoRestTimer: e.target.checked })} aria-label="Start rest timer after each set" />
            <span />
          </span>
        </label>
        <label className="list-item">
          <span className="grow title">Sound when rest is over</span>
          <span className="switch">
            <input type="checkbox" checked={settings.restSound} onChange={(e) => updateSettings({ restSound: e.target.checked })} aria-label="Rest timer sound" />
            <span />
          </span>
        </label>
      </div>
      <p className="tiny muted" style={{ margin: '12px 4px 0' }}>
        Each exercise's rest length is in its ⋯ menu; the default is in Settings.
      </p>
    </Sheet>
  );
}
