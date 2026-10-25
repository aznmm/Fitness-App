import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { LineChart } from '../components/charts/LineChart';
import { CustomExerciseSheet } from '../components/CustomExerciseSheet';
import { confirm } from '../components/Dialogs';
import { PageHeader } from '../components/Layout';
import { describeSet } from '../components/WorkoutEditor';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../data/exercises';
import { exerciseSessions, recordsFromSessions, repMaxes, setE1RM, setVolume, workingSets, type ExerciseSession } from '../lib/calc';
import { formatDate, relativeDay } from '../lib/dates';
import { levelFor, liftScore, standardFor } from '../lib/strength';
import { formatDistance, formatDuration, formatVolume, formatWeight, fromKg, fromMetres, trimNumber } from '../lib/units';
import { useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Exercise, ExerciseType, Unit } from '../types';

interface Metric {
  id: string;
  label: string;
  value: (s: ExerciseSession) => number;
  format: (v: number) => string;
}

function metricsFor(type: ExerciseType, unit: Unit, bw?: number): Metric[] {
  const best = (s: ExerciseSession, f: (x: ExerciseSession['sets'][number]) => number) => Math.max(0, ...workingSets(s.sets).map(f));
  const w = (kg: number) => `${trimNumber(fromKg(kg, unit))} ${unit}`;
  switch (type) {
    case 'weight_reps':
      return [
        { id: 'e1rm', label: 'Est. 1RM', value: (s) => best(s, (x) => setE1RM(x, type)), format: w },
        { id: 'max', label: 'Heaviest', value: (s) => best(s, (x) => x.weight ?? 0), format: w },
        { id: 'vol', label: 'Volume', value: (s) => workingSets(s.sets).reduce((a, x) => a + setVolume(x), 0), format: (v) => formatVolume(v, unit) },
      ];
    case 'reps':
      return [
        { id: 'reps', label: 'Best set', value: (s) => best(s, (x) => x.reps ?? 0), format: (v) => `${v} reps` },
        { id: 'total', label: 'Total reps', value: (s) => workingSets(s.sets).reduce((a, x) => a + (x.reps ?? 0), 0), format: (v) => `${v} reps` },
        ...(bw ? [{ id: 'e1rm', label: 'Est. 1RM', value: (s: ExerciseSession) => best(s, (x) => setE1RM(x, type, bw)), format: w }] : []),
      ];
    case 'duration':
      return [{ id: 'time', label: 'Longest', value: (s) => best(s, (x) => x.duration ?? 0), format: formatDuration }];
    case 'distance_duration':
      return [
        { id: 'dist', label: 'Distance', value: (s) => workingSets(s.sets).reduce((a, x) => a + (x.distance ?? 0), 0), format: (v) => formatDistance(v, unit) },
        { id: 'time', label: 'Time', value: (s) => workingSets(s.sets).reduce((a, x) => a + (x.duration ?? 0), 0), format: formatDuration },
      ];
  }
}

export function ExerciseDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { byId } = useExercises();
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const deleteCustom = useStore((s) => s.deleteCustomExercise);
  const bodyweight = useBodyweight();
  const [metricId, setMetricId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const exercise = byId.get(id);
  const sessions = useMemo(() => exerciseSessions(workouts, id), [workouts, id]);

  if (!exercise) return <Navigate to="/exercises" replace />;

  const unit = settings.unit;
  const records = recordsFromSessions(sessions, exercise.type, bodyweight);
  const metrics = metricsFor(exercise.type, unit, bodyweight);
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const points = sessions.map((s) => ({ x: s.date, y: metric.value(s) })).filter((p) => p.y > 0);
  const used = workouts.some((w) => w.exercises.some((we) => we.exerciseId === id));

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete exercise?',
      message: used ? 'It stays in past workouts but will show as “Unknown exercise”.' : undefined,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      deleteCustom(exercise.id);
      navigate('/exercises', { replace: true });
    }
  };

  return (
    <div className="page">
      <PageHeader
        back
        eyebrow={`${MUSCLE_LABELS[exercise.primary]}${exercise.secondary.length ? ` + ${exercise.secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}` : ''} · ${EQUIPMENT_LABELS[exercise.equipment]}`}
        title={exercise.name}
        actions={
          exercise.custom && (
            <>
              <button className="icon-btn filled" aria-label="Edit exercise" onClick={() => setEditing(true)}>
                <Pencil size={18} />
              </button>
              <button className="icon-btn filled" aria-label="Delete exercise" onClick={remove}>
                <Trash2 size={18} />
              </button>
            </>
          )
        }
      />

      <RecordStats exercise={exercise} records={records} unit={unit} bodyweight={bodyweight} />

      {exercise.standard && records.bestE1RM > 0 && bodyweight && (
        <StandardCard exercise={exercise} e1rm={records.bestE1RM} bodyweight={bodyweight} sex={settings.sex} unit={unit} />
      )}

      <section className="section">
        <div className="section-head">
          <h2>Progress</h2>
        </div>
        {metrics.length > 1 && (
          <div className="seg" role="group" aria-label="Chart metric" style={{ marginBottom: 12 }}>
            {metrics.map((m) => (
              <button key={m.id} aria-pressed={m.id === metric.id} onClick={() => setMetricId(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        <div className="card">
          {points.length >= 2 ? (
            <LineChart
              points={points}
              label={`${exercise.name} ${metric.label} over time`}
              formatY={(v) => (metric.id === 'vol' ? formatVolume(v, unit, true).replace(` ${unit}`, '') : metric.id === 'time' ? formatDuration(v) : metric.id === 'dist' ? trimNumber(fromMetres(v, unit), 1) : trimNumber(metric.id === 'reps' || metric.id === 'total' ? v : fromKg(v, unit), 0))}
              formatX={(x) => formatDate(x)}
              formatXLong={(x) => `${formatDate(x, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${metric.format(points.find((p) => p.x === x)?.y ?? 0)}`}
            />
          ) : (
            <p className="muted small" style={{ margin: 0, textAlign: 'center', padding: '24px 0' }}>
              {sessions.length ? 'Log this exercise once more to see a trend.' : 'No history yet — log it in a workout to start tracking.'}
            </p>
          )}
        </div>
      </section>

      {exercise.type === 'weight_reps' && records.heaviest > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 10 }}>Rep maxes</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Reps</th>
                  <th>Best weight</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {repMaxes(sessions).map((r) => (
                  <tr key={r.reps}>
                    <td>{r.reps} RM</td>
                    <td style={{ fontWeight: 650 }}>{r.weight ? formatWeight(r.weight, unit) : '—'}</td>
                    <td className="muted">{r.date ? formatDate(r.date) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 10 }}>History</h2>
        {sessions.length === 0 && <p className="muted small">Nothing logged yet.</p>}
        {[...sessions].reverse().map((s) => {
          let n = 0;
          return (
            <Link to={`/history/${s.workoutId}`} className="card link" key={s.workoutId + s.date}>
              <div className="spread" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 650 }}>{relativeDay(s.date)}</span>
                <span className="small muted">{workouts.find((w) => w.id === s.workoutId)?.name}</span>
              </div>
              {s.sets.map((set) => (
                <div className="set-line" key={set.id}>
                  <span className="n">{set.kind === 'warmup' ? 'W' : ++n}</span>
                  <span className="grow">{describeSet(set, exercise.type, unit)}</span>
                  {exercise.type === 'weight_reps' && set.kind !== 'warmup' && <span className="muted small">{formatWeight(setE1RM(set, exercise.type), unit)}</span>}
                </div>
              ))}
            </Link>
          );
        })}
      </section>

      {editing && <CustomExerciseSheet existing={exercise} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    </div>
  );
}

function RecordStats({ exercise, records, unit, bodyweight }: { exercise: Exercise; records: ReturnType<typeof recordsFromSessions>; unit: Unit; bodyweight?: number }) {
  const tiles: [string, string][] = [];
  switch (exercise.type) {
    case 'weight_reps':
      tiles.push(['Est. 1RM', records.bestE1RM ? formatWeight(records.bestE1RM, unit) : '—']);
      tiles.push(['Heaviest', records.heaviest ? formatWeight(records.heaviest, unit) : '—']);
      tiles.push(['Best set', records.bestE1RMSet ? describeSet(records.bestE1RMSet, exercise.type, unit).replace(` ${unit}`, '') : '—']);
      break;
    case 'reps':
      tiles.push(['Most reps', records.mostReps ? String(records.mostReps) : '—']);
      tiles.push(['Most added', records.heaviest ? formatWeight(records.heaviest, unit) : '—']);
      tiles.push(['Est. 1RM', bodyweight && records.bestE1RM ? formatWeight(records.bestE1RM, unit) : '—']);
      break;
    case 'duration':
      tiles.push(['Longest', records.longestDuration ? formatDuration(records.longestDuration) : '—']);
      break;
    case 'distance_duration':
      tiles.push(['Longest', records.longestDistance ? formatDistance(records.longestDistance, unit) : '—']);
      break;
  }
  tiles.push(['Sessions', String(records.sessions)]);
  const shown = tiles.slice(0, tiles.length === 4 ? 4 : 3);
  return (
    <div className={`stat-grid${shown.length === 2 || shown.length === 4 ? ' two' : ''}`}>
      {shown.map(([label, value]) => (
        <div className="stat" key={label}>
          <div className="label">{label}</div>
          <div className="value tabular">{value}</div>
        </div>
      ))}
    </div>
  );
}

function StandardCard({ exercise, e1rm, bodyweight, sex, unit }: { exercise: Exercise; e1rm: number; bodyweight: number; sex: 'male' | 'female'; unit: Unit }) {
  const standard = standardFor(exercise, bodyweight, sex);
  if (!standard) return null;
  const score = liftScore(e1rm, standard);
  const level = levelFor(score);
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="spread">
        <div>
          <div className="small muted" style={{ fontWeight: 650 }}>
            Lift score
          </div>
          <div style={{ fontSize: 24, fontWeight: 750 }}>
            {Math.round(score)} <span className="small secondary">{level.name}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }} className="small secondary">
          Intermediate at your bodyweight
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{formatWeight(standard, unit)} 1RM</div>
        </div>
      </div>
      {exercise.equipment === 'dumbbell' && <div className="tiny muted" style={{ marginTop: 6 }}>Log the weight of one dumbbell.</div>}
    </div>
  );
}
