import { ChevronDown, Dumbbell, Timer, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { choose, confirm, toast } from '../components/Dialogs';
import { EmptyState, useScrolled } from '../components/Layout';
import { RestSheet } from '../components/RestTimerBar';
import { WorkoutEditor } from '../components/WorkoutEditor';
import { workoutVolume } from '../lib/calc';
import { useNow } from '../lib/useNow';
import { formatDuration, formatVolume } from '../lib/units';
import { countDoneSets, countUntickedEntries, pruneIncomplete, type WorkoutUpdater } from '../lib/workoutOps';
import { useStore } from '../store/useStore';

export function ActiveWorkout() {
  const navigate = useNavigate();
  const active = useStore((s) => s.active);
  const unit = useStore((s) => s.settings.unit);
  const updateActive = useStore((s) => s.updateActive);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const resting = useStore((s) => !!s.rest);
  const [restSheet, setRestSheet] = useState(false);
  const now = useNow(1000);
  const scrolled = useScrolled(8);
  // Finishing clears `active`; don't let the redirect below beat the navigation to the summary.
  const finishing = useRef(false);

  const onChange = useCallback((fn: WorkoutUpdater) => updateActive(fn), [updateActive]);

  if (!active) return finishing.current ? null : <Navigate to="/" replace />;

  const doneSets = countDoneSets(active);
  const unticked = countUntickedEntries(active);

  const discard = async () => {
    const ok = await confirm({
      title: 'Discard workout?',
      message: 'All sets logged in this workout will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
    if (ok) {
      discardWorkout();
      navigate('/');
    }
  };

  const finish = async () => {
    let keepEntries = false;
    if (doneSets + unticked === 0) {
      const ok = await confirm({
        title: 'Nothing logged yet',
        message: 'Enter your sets, or tick the ✓ next to an exercise when you finish it. Discard this empty workout instead?',
        confirmLabel: 'Discard workout',
        cancelLabel: 'Keep going',
        danger: true,
      });
      if (ok) {
        discardWorkout();
        navigate('/');
      }
      return;
    }
    if (unticked > 0) {
      const sets = `${unticked} set${unticked > 1 ? 's' : ''}`;
      const choice = await choose({
        title: 'Finish workout?',
        message: `${sets} ${unticked > 1 ? 'have' : 'has'} numbers entered but ${unticked > 1 ? "aren't" : "isn't"} ticked.`,
        options: [{ label: `Save ${unticked > 1 ? 'them' : 'it'} as done`, bold: true }, { label: `Leave ${unticked > 1 ? 'them' : 'it'} out` }],
        cancelLabel: 'Keep going',
      });
      if (choice === null) return;
      keepEntries = choice === 0;
      if (!keepEntries && doneSets === 0) {
        toast('Nothing ticked, so there is nothing to save yet');
        return;
      }
    }
    finishing.current = true;
    const saved = finishWorkout({ keepEntries });
    if (saved) navigate(`/history/${saved.id}?summary=1`, { replace: true });
    else finishing.current = false;
  };

  return (
    <div className="page no-tabs">
      <div className={`navbar workout-bar${scrolled ? ' scrolled' : ''}`}>
        <button className="glass-btn" aria-label="Minimize workout" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
          <ChevronDown size={22} strokeWidth={2.4} />
        </button>
        <div className="workout-timer">
          <span className="row" style={{ gap: 6, justifyContent: 'center' }}>
            <span className="dot" style={{ background: 'var(--green)' }} aria-hidden />
            {formatDuration((now - active.startedAt) / 1000)}
          </span>
        </div>
        <div className="navbar-side end" style={{ gap: 8 }}>
          <button className={`glass-btn${resting ? ' accent' : ''}`} aria-label="Rest timer" onClick={() => setRestSheet(true)}>
            <Timer size={20} />
          </button>
          <button className="btn btn-good btn-sm" onClick={finish}>
            Finish
          </button>
        </div>
      </div>

      <input
        className="name-input"
        value={active.name}
        onChange={(e) => updateActive((w) => ({ ...w, name: e.target.value }))}
        aria-label="Workout name"
      />
      <div className="row small muted" style={{ gap: 14, marginTop: 2 }}>
        <span>
          <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {doneSets + unticked}
          </span>{' '}
          set{doneSets + unticked === 1 ? '' : 's'} logged
        </span>
        <span>
          <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {formatVolume(workoutVolume(pruneIncomplete(active, true)), unit)}
          </span>{' '}
          volume
        </span>
      </div>
      <textarea
        className="textarea"
        style={{ marginTop: 14 }}
        rows={1}
        placeholder="Add a note…"
        value={active.notes ?? ''}
        onChange={(e) => updateActive((w) => ({ ...w, notes: e.target.value }))}
      />

      {active.exercises.length === 0 && (
        <EmptyState icon={<Dumbbell size={30} />} title="Empty workout">
          <p className="small">Add your first exercise to start logging sets.</p>
        </EmptyState>
      )}

      <WorkoutEditor workout={active} onChange={onChange} live />

      <button className="btn btn-plain-danger btn-block" style={{ marginTop: 10 }} onClick={discard}>
        <Trash2 size={17} /> Discard workout
      </button>

      {restSheet && <RestSheet onClose={() => setRestSheet(false)} />}

    </div>
  );
}
