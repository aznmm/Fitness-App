import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { LineChart } from '../components/charts/LineChart';
import { CustomExerciseSheet } from '../components/CustomExerciseSheet';
import { ExerciseGuide } from '../components/ExerciseGuide';
import { confirm } from '../components/Dialogs';
import { PageHeader } from '../components/Layout';
import { ScoreRing } from '../components/ScoreRing';
import { describeSet } from '../components/WorkoutEditor';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../data/exercises';
import { exerciseSessions, recordsFromSessions, repMaxes, setE1RM, setVolume, workingSets, type ExerciseSession } from '../lib/calc';
import { formatDate, relativeDay } from '../lib/dates';
import { GAUGE_MAX, levelFor, liftScore, standardFor } from '../lib/strength';
import { cardioRate, distanceSpec, formatCardioDistance } from '../lib/cardio';
import { formatDuration, formatVolume, formatWeight, fromKg, trimNumber } from '../lib/units';
import { useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Exercise, ExerciseType, Unit } from '../types';

interface Metric {
  id: string;
  label: string;
  value: (s: ExerciseSession) => number;
  format: (v: number) => string;
}

function metricsFor(exercise: Exercise, unit: Unit, bw?: number): Metric[] {
  const type: ExerciseType = exercise.type;
  const spec = distanceSpec(exercise, unit);
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
      return [
        { id: 'time', label: exercise.primary === 'cardio' ? 'Time' : 'Longest', value: (s) => best(s, (x) => x.duration ?? 0), format: formatDuration },
        ...(exercise.primary === 'cardio'
          ? [{ id: 'kcal', label: 'Calories', value: (s: ExerciseSession) => workingSets(s.sets).reduce((a, x) => a + (x.calories ?? 0), 0), format: (v: number) => `${Math.round(v)} kcal` }]
          : []),
      ];
    case 'distance_duration':
      return [
        { id: 'dist', label: 'Distance', value: (s) => workingSets(s.sets).reduce((a, x) => a + (x.distance ?? 0), 0), format: (v) => formatCardioDistance(v, spec) },
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
  const metrics = metricsFor(exercise, unit, bodyweight);
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
        compact
        eyebrow={`${MUSCLE_LABELS[exercise.primary]}${exercise.secondary.length ? ` + ${exercise.secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}` : ''} · ${EQUIPMENT_LABELS[exercise.equipment]}`}
        title={exercise.name}
        actions={
          exercise.custom && (
            <>
              <button className="glass-btn" aria-label="Edit exercise" onClick={() => setEditing(true)}>
                <Pencil size={17} />
              </button>
              <button className="glass-btn" style={{ color: 'var(--red)' }} aria-label="Delete exercise" onClick={remove}>
                <Trash2 size={17} />
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
              formatY={(v) => (metric.id === 'vol' ? formatVolume(v, unit, true).replace(` ${unit}`, '') : metric.id === 'time' ? formatDuration(v) : metric.id === 'dist' ? trimNumber(v / distanceSpec(exercise, unit).metres, 1) : metric.id === 'kcal' ? String(Math.round(v)) : trimNumber(metric.id === 'reps' || metric.id === 'total' ? v : fromKg(v, unit), 0))}
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

      <section className="section">
        <h2 style={{ marginBottom: 12 }}>Muscles & form</h2>
        <ExerciseGuide exercise={exercise} />
      </section>

      {exercise.type === 'weight_reps' && records.heaviest > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Rep maxes</h2>
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
                    <td className="muted">{r.reps} RM</td>
                    <td className="rounded-num" style={{ fontWeight: 600 }}>
                      {r.weight ? formatWeight(r.weight, unit) : '—'}
                    </td>
                    <td className="muted">{r.date ? formatDate(r.date) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 12 }}>History</h2>
        {sessions.length === 0 && <p className="muted small">Nothing logged yet.</p>}
        {[...sessions].reverse().map((s) => {
          let n = 0;
          return (
            <Link to={`/history/${s.workoutId}`} className="card link" key={s.workoutId + s.date}>
              <div className="spread" style={{ marginBottom: 10 }}>
                <h3>{relativeDay(s.date)}</h3>
                <span className="small muted">{workouts.find((w) => w.id === s.workoutId)?.name}</span>
              </div>
              <div className="stack-sm" style={{ gap: 8 }}>
                {s.sets.map((set) => (
                  <div className="set-line" key={set.id}>
                    <span className={`n${set.kind === 'warmup' ? ' warmup' : ''}`}>{set.kind === 'warmup' ? 'W' : ++n}</span>
                    <span className="grow">{describeSet(set, exercise, unit)}</span>
                    {exercise.type === 'weight_reps' && set.kind !== 'warmup' && (
                      <span className="muted small rounded-num">{formatWeight(setE1RM(set, exercise.type), unit)}</span>
                    )}
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      {editing && <CustomExerciseSheet existing={exercise} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    </div>
  );
}

/** Matches a trailing unit such as " lb" so it can be set smaller than the number. */
const UNIT_SUFFIX = / (lb|kg|mi|km|m|yd)$/;

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
      if (exercise.assisted) tiles.push(['Least assist', records.leastAssist !== undefined ? formatWeight(Math.abs(records.leastAssist), unit) : '—']);
      else tiles.push(['Most added', records.heaviest ? formatWeight(records.heaviest, unit) : '—']);
      tiles.push(['Est. 1RM', bodyweight && records.bestE1RM ? formatWeight(records.bestE1RM, unit) : '—']);
      break;
    case 'duration':
      tiles.push(['Longest', records.longestDuration ? formatDuration(records.longestDuration) : '—']);
      break;
    case 'distance_duration':
      tiles.push(['Longest', records.longestDistance ? formatCardioDistance(records.longestDistance, distanceSpec(exercise, unit)) : '—']);
      tiles.push(['Best', records.bestRateSet ? (cardioRate(records.bestRateSet, exercise, unit) ?? '—') : '—']);
      break;
  }
  tiles.push(['Sessions', String(records.sessions)]);
  const shown = tiles.slice(0, tiles.length === 4 ? 4 : 3);
  return (
    <div className={`stat-grid${shown.length === 2 || shown.length === 4 ? ' two' : ''}`}>
      {shown.map(([label, value]) => (
        <div className="stat" key={label}>
          <div className="label">{label}</div>
          <div className="value">
            {value.replace(UNIT_SUFFIX, '')}
            {UNIT_SUFFIX.test(value) && <small>{value.match(UNIT_SUFFIX)![1]}</small>}
          </div>
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
      <div className="score-card" style={{ gap: 16 }}>
        <ScoreRing progress={score / GAUGE_MAX} size={76} stroke={9} label={`Lift score ${Math.round(score)}, ${level.name}`}>
          <span className="score" style={{ fontSize: 22 }}>
            {Math.round(score)}
          </span>
        </ScoreRing>
        <div className="grow">
          <div className="card-title">Lift score</div>
          <div className="level-name" style={{ fontSize: 19 }}>
            {level.name}
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            Intermediate for you:{' '}
            <span className="rounded-num" style={{ color: 'var(--text)', fontWeight: 600 }}>
              {formatWeight(standard, unit)}
            </span>{' '}
            1RM
          </div>
        </div>
      </div>
      {exercise.equipment === 'dumbbell' && (
        <div className="tiny muted" style={{ marginTop: 10 }}>
          Log the weight of one dumbbell.
        </div>
      )}
    </div>
  );
}
