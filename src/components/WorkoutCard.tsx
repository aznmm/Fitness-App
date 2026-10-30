import { Clock, Dumbbell, Layers, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { muscleClass } from '../data/exercises';
import { workingSets, workoutDurationMs, workoutSetCount, workoutVolume } from '../lib/calc';
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
        <div className="grow">
          <h3 className="truncate">{workout.name}</h3>
          <div className="small muted" style={{ marginTop: 2 }}>
            {relativeDay(workout.startedAt)} · {formatTime(workout.startedAt)}
          </div>
        </div>
        {!!prCount && (
          <span className="badge gold">
            <Trophy size={12} /> {prCount} PR{prCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="row small" style={{ gap: 16, margin: '12px 0 12px', color: 'var(--text-2)' }}>
        <span className="row" style={{ gap: 5 }}>
          <Clock size={15} /> <span className="rounded-num">{formatElapsed(workoutDurationMs(workout))}</span>
        </span>
        {volume > 0 && (
          <span className="row" style={{ gap: 5 }}>
            <Dumbbell size={15} /> <span className="rounded-num">{formatVolume(volume, unit)}</span>
          </span>
        )}
        <span className="row" style={{ gap: 5 }}>
          <Layers size={15} />{' '}
          <span className="rounded-num">
            {workoutSetCount(workout)} set{workoutSetCount(workout) === 1 ? '' : 's'}
          </span>
        </span>
      </div>
      <div className="stack-sm" style={{ gap: 7 }}>
        {shown.map((we) => (
          <div key={we.id} className="row small truncate" style={{ gap: 10 }}>
            <span className={`dot ${muscleClass(byId.get(we.exerciseId)?.primary)}`} aria-hidden />
            <span className="rounded-num muted" style={{ minWidth: 20 }}>
              {workingSets(we.sets).length || we.sets.length}×
            </span>
            <span className="truncate">{exerciseName(byId, we.exerciseId)}</span>
          </div>
        ))}
        {more > 0 && (
          <div className="small muted" style={{ paddingLeft: 18 }}>
            +{more} more
          </div>
        )}
      </div>
    </Link>
  );
}
