import { ChevronDown, Dumbbell, Trash2 } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { confirm } from '../components/Dialogs';
import { EmptyState } from '../components/Layout';
import { WorkoutEditor } from '../components/WorkoutEditor';
import { workoutVolume } from '../lib/calc';
import { useNow } from '../lib/useNow';
import { formatDuration, formatVolume } from '../lib/units';
import { countDoneSets, countIncompleteSets, type WorkoutUpdater } from '../lib/workoutOps';
import { useStore } from '../store/useStore';

export function ActiveWorkout() {
  const navigate = useNavigate();
  const active = useStore((s) => s.active);
  const unit = useStore((s) => s.settings.unit);
  const updateActive = useStore((s) => s.updateActive);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const now = useNow(1000);
  // Finishing clears `active`; don't let the redirect below beat the navigation to the summary.
  const finishing = useRef(false);

  const onChange = useCallback((fn: WorkoutUpdater) => updateActive(fn), [updateActive]);

  if (!active) return finishing.current ? null : <Navigate to="/" replace />;

  const doneSets = countDoneSets(active);
  const incomplete = countIncompleteSets(active);

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
    if (doneSets === 0) {
      const ok = await confirm({
        title: 'No sets completed',
        message: 'Tick the ✓ on each set you finish. Discard this empty workout instead?',
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
    if (incomplete > 0) {
      const ok = await confirm({
        title: 'Finish workout?',
        message: `${incomplete} unfinished set${incomplete > 1 ? 's' : ''} will be removed.`,
        confirmLabel: 'Finish',
        cancelLabel: 'Keep going',
      });
      if (!ok) return;
    }
    finishing.current = true;
    const saved = finishWorkout();
    if (saved) navigate(`/history/${saved.id}?summary=1`, { replace: true });
    else finishing.current = false;
  };

  return (
    <div className="page no-tabs">
      <div className="sticky-header">
        <div className="workout-head">
          <button className="icon-btn filled" aria-label="Minimize workout" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
            <ChevronDown size={22} />
          </button>
          <div className="grow tabular" style={{ fontWeight: 700, fontSize: 17 }}>
            {formatDuration((now - active.startedAt) / 1000)}
          </div>
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
      <div className="small muted">
        {doneSets} set{doneSets === 1 ? '' : 's'} done · {formatVolume(workoutVolume(active), unit)}
      </div>
      <textarea
        className="textarea"
        style={{ marginTop: 10, minHeight: 40 }}
        rows={1}
        placeholder="Workout notes"
        value={active.notes ?? ''}
        onChange={(e) => updateActive((w) => ({ ...w, notes: e.target.value }))}
      />

      {active.exercises.length === 0 && (
        <EmptyState icon={<Dumbbell size={36} />} title="Empty workout">
          <p className="small">Add your first exercise to start logging sets.</p>
        </EmptyState>
      )}

      <WorkoutEditor workout={active} onChange={onChange} live />

      <button className="btn btn-danger btn-block" style={{ marginTop: 12 }} onClick={discard}>
        <Trash2 size={18} /> Discard workout
      </button>

    </div>
  );
}
