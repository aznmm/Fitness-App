import { Clock, Dumbbell, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workingSets, workoutDurationMs, workoutVolume } from '../lib/calc';
import { formatTime, relativeDay } from '../lib/dates';
import { formatElapsed, formatVolume } from '../lib/units';
import { exerciseName, useExercises, useStore } from '../store/useStore';
import type { Workout } from '../types';

export function WorkoutCard({ workout, prCount }: { workout: Workout; prCount?: number }) {
  const { byId } = useExercises();
  const unit = useStore((s) => s.settings.unit);
  const volume = workoutVolume(workout);
  const shown = workout.exercises.slice(0, 4);
  const more = workout.exercises.length - shown.length;

  return (
    <Link to={`/history/${workout.id}`} className="card link">
      <div className="spread">
        <h3 className="truncate">{workout.name}</h3>
        {!!prCount && (
          <span className="badge gold">
            <Trophy size={12} /> {prCount} PR{prCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="small muted" style={{ marginTop: 2 }}>
        {relativeDay(workout.startedAt)} · {formatTime(workout.startedAt)}
      </div>
      <div className="row small secondary" style={{ gap: 14, margin: '10px 0' }}>
        <span className="row" style={{ gap: 4 }}>
          <Clock size={14} /> {formatElapsed(workoutDurationMs(workout))}
        </span>
        {volume > 0 && (
          <span className="row" style={{ gap: 4 }}>
            <Dumbbell size={14} /> {formatVolume(volume, unit)}
          </span>
        )}
      </div>
      <div className="stack-sm">
        {shown.map((we) => (
          <div key={we.id} className="small secondary truncate">
            <span className="tabular" style={{ color: 'var(--muted)', marginRight: 6 }}>
              {workingSets(we.sets).length || we.sets.length}×
            </span>
            {exerciseName(byId, we.exerciseId)}
          </div>
        ))}
        {more > 0 && <div className="small muted">+{more} more</div>}
      </div>
    </Link>
  );
}
