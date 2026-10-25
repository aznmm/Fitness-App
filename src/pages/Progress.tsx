import { ChevronRight, Info, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { Sheet } from '../components/Sheet';
import { ScoreDelta } from '../components/StrengthScoreCard';
import { MUSCLE_LABELS } from '../data/exercises';
import { exerciseRecords } from '../lib/calc';
import { DAY_MS, addDays, formatDate, fromDateInput, relativeDay, relativeDayInline, toDateInput } from '../lib/dates';
import { exerciseUsage, setsPerMuscle, VOLUME_MUSCLES, weeklyStats } from '../lib/stats';
import { GROUP_LABELS, LEVELS, levelFor, SCORE_WINDOW_DAYS, STRENGTH_GROUPS } from '../lib/strength';
import { formatVolume, formatWeight, fromKg, toKg, trimNumber } from '../lib/units';
import { useStrength } from '../lib/useStrength';
import { exerciseName, useBodyweight, useExercises, useStore } from '../store/useStore';
import { PageHeader } from '../components/Layout';

export function Progress() {
  return (
    <div className="page">
      <PageHeader title="Progress" />
      <StrengthSection />
      <BodyweightSection />
      <WeeklySection />
      <MuscleSection />
      <RecordsSection />
    </div>
  );
}

function StrengthSection() {
  const { current, history, change, bodyweight } = useStrength();
  const { byId } = useExercises();
  const [info, setInfo] = useState(false);

  return (
    <section>
      <div className="card">
        <div className="spread">
          <div className="small muted" style={{ fontWeight: 650 }}>
            Strength score
          </div>
          <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="How the strength score works" onClick={() => setInfo(true)}>
            <Info size={18} />
          </button>
        </div>
        {current.overall === null ? (
          <p className="secondary" style={{ margin: '4px 0 0' }}>
            {bodyweight
              ? 'Log a main lift (bench, squat, deadlift, rows, overhead press, curls…) to calculate your score.'
              : 'Add your bodyweight below — the score compares your lifts to your bodyweight.'}
          </p>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
              <div className="hero-number">{Math.round(current.overall)}</div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ fontWeight: 700 }}>{levelFor(current.overall).name}</div>
                <ScoreDelta change={change} />
              </div>
            </div>
            {history.length >= 2 && (
              <div style={{ marginTop: 12 }}>
                <LineChart
                  points={history.map((p) => ({ x: p.date, y: Math.round(p.score) }))}
                  label="Strength score, last 12 weeks"
                  formatY={(v) => String(Math.round(v))}
                  formatX={(x) => formatDate(x)}
                  formatXLong={(x) => `Week of ${formatDate(x)}`}
                  height={150}
                />
              </div>
            )}
          </>
        )}
      </div>

      {current.overall !== null && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Strength balance</h3>
          <p className="small muted" style={{ margin: '0 0 12px' }}>
            Best lift per muscle group, last {SCORE_WINDOW_DAYS} days
          </p>
          <div className="stack" style={{ gap: 12 }}>
            {STRENGTH_GROUPS.map((g) => {
              const gs = current.groups[g];
              return (
                <div key={g}>
                  <div className="spread small">
                    <span style={{ fontWeight: 650 }}>{GROUP_LABELS[g]}</span>
                    <span className="tabular">
                      {gs ? (
                        <>
                          <strong>{Math.round(gs.score)}</strong> <span className="muted">{levelFor(gs.score).name}</span>
                        </>
                      ) : (
                        <span className="muted">No data</span>
                      )}
                    </span>
                  </div>
                  <div className="meter" style={{ marginTop: 6 }} aria-hidden>
                    <div style={{ width: `${gs ? Math.min(100, (gs.score / 800) * 100) : 0}%` }} />
                  </div>
                  {gs && (
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {exerciseName(byId, gs.exerciseId)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {info && (
        <Sheet title="Strength score" onClose={() => setInfo(false)}>
          <div className="secondary small" style={{ lineHeight: 1.55 }}>
            <p style={{ marginTop: 0 }}>
              Your score compares your estimated one-rep max on each main lift with typical strength standards for your bodyweight and sex. Lifting
              exactly the <strong>intermediate</strong> standard scores <strong>500</strong>.
            </p>
            <p>
              Each muscle group (chest, back, shoulders, arms, legs) takes the best lift you've done in the last {SCORE_WINDOW_DAYS} days. Your overall
              score is the average of the groups you've trained. Sets above 12 reps and warm-ups are ignored.
            </p>
            <p>One-rep maxes are estimated with the Epley formula: weight × (1 + reps ÷ 30).</p>
          </div>
          <div className="list" style={{ marginTop: 8 }}>
            {LEVELS.map((l, i) => (
              <div className="list-item" key={l.name} style={{ minHeight: 44 }}>
                <span className="grow" style={{ fontWeight: 600 }}>
                  {l.name}
                </span>
                <span className="tabular muted">{LEVELS[i + 1] ? `${l.min}–${LEVELS[i + 1].min - 1}` : `${l.min}+`}</span>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </section>
  );
}

function BodyweightSection() {
  const entries = useStore((s) => s.bodyweights);
  const unit = useStore((s) => s.settings.unit);
  const addBodyweight = useStore((s) => s.addBodyweight);
  const deleteBodyweight = useStore((s) => s.deleteBodyweight);
  const current = useBodyweight();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [showAll, setShowAll] = useState(false);

  const submit = () => {
    const n = Number(value.replace(',', '.'));
    if (!(n > 0)) return;
    const d = date === toDateInput(Date.now()) ? Date.now() : fromDateInput(date);
    addBodyweight(toKg(n, unit), d);
    setValue('');
  };

  const first = entries[0]?.weight;
  const delta = current !== undefined && first !== undefined && entries.length > 1 ? fromKg(current - first, unit) : undefined;
  const recent = [...entries].reverse().slice(0, showAll ? undefined : 5);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Bodyweight</h2>
        {current !== undefined && (
          <span className="small secondary tabular">
            {formatWeight(current, unit)}
            {delta !== undefined && Math.abs(delta) >= 0.1 && (
              <span className="muted">
                {' '}
                ({delta > 0 ? '+' : '−'}
                {trimNumber(Math.abs(delta))} since start)
              </span>
            )}
          </span>
        )}
      </div>
      <div className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            className="input"
            inputMode="decimal"
            placeholder={current !== undefined ? trimNumber(fromKg(current, unit)) : `Weight (${unit})`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`Bodyweight in ${unit}`}
            style={{ flex: 1.2 }}
          />
          <input className="input" type="date" value={date} max={toDateInput(Date.now())} onChange={(e) => setDate(e.target.value)} aria-label="Date" style={{ flex: 1 }} />
          <button className="btn btn-primary" type="submit" disabled={!(Number(value.replace(',', '.')) > 0)}>
            Log
          </button>
        </form>
        {entries.length >= 2 && (
          <div style={{ marginTop: 14 }}>
            <LineChart
              points={entries.map((e) => ({ x: e.date, y: fromKg(e.weight, unit) }))}
              label="Bodyweight over time"
              formatY={(v) => trimNumber(v, 0)}
              formatX={(x) => formatDate(x)}
              formatXLong={(x) => `${formatDate(x, { month: 'short', day: 'numeric', year: 'numeric' })} · ${unit}`}
              height={150}
            />
          </div>
        )}
        {recent.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {recent.map((e) => (
              <div className="spread small" key={e.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <span className="secondary">{relativeDay(e.date)}</span>
                <span className="row">
                  <span className="tabular" style={{ fontWeight: 650 }}>
                    {formatWeight(e.weight, unit)}
                  </span>
                  <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete entry" onClick={() => deleteBodyweight(e.id)}>
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
            {entries.length > 5 && (
              <button className="btn btn-ghost btn-sm btn-block" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show less' : `Show all ${entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function WeeklySection() {
  const workouts = useStore((s) => s.workouts);
  const unit = useStore((s) => s.settings.unit);
  const [metric, setMetric] = useState<'volume' | 'workouts' | 'sets'>('volume');
  const weeks = useMemo(() => weeklyStats(workouts, 12), [workouts]);
  const avg = weeks.reduce((a, w) => a + w[metric], 0) / weeks.length;

  return (
    <section className="section">
      <div className="section-head">
        <h2>Weekly</h2>
        <span className="small muted">
          avg {metric === 'volume' ? formatVolume(avg, unit, true) : trimNumber(avg)} / week
        </span>
      </div>
      <div className="seg" role="group" aria-label="Weekly metric" style={{ marginBottom: 10 }}>
        <button aria-pressed={metric === 'volume'} onClick={() => setMetric('volume')}>
          Volume
        </button>
        <button aria-pressed={metric === 'workouts'} onClick={() => setMetric('workouts')}>
          Workouts
        </button>
        <button aria-pressed={metric === 'sets'} onClick={() => setMetric('sets')}>
          Sets
        </button>
      </div>
      <div className="card">
        <BarChart
          label={`Weekly ${metric}, last 12 weeks`}
          bars={weeks.map((w) => ({
            key: w.weekStart,
            tick: formatDate(w.weekStart, { month: 'numeric', day: 'numeric' }),
            value: metric === 'volume' ? fromKg(w.volume, unit) : w[metric],
            title: `Week of ${formatDate(w.weekStart)}`,
          }))}
          formatValue={metric === 'volume' ? undefined : (v) => String(Math.round(v))}
        />
      </div>
    </section>
  );
}

function MuscleSection() {
  const workouts = useStore((s) => s.workouts);
  const { byId } = useExercises();
  const [range, setRange] = useState<7 | 30>(7);
  const sets = useMemo(() => setsPerMuscle(workouts, byId, Date.now() - range * DAY_MS), [workouts, byId, range]);
  const perWeek = (n: number) => (range === 7 ? n : (n / 30) * 7);
  const rows = VOLUME_MUSCLES.map((m) => ({ m, n: perWeek(sets[m]) }));
  const max = Math.max(22, ...rows.map((r) => r.n));
  const BAND = [10, 20];

  return (
    <section className="section">
      <div className="section-head">
        <h2>Sets per muscle</h2>
        <div className="seg" role="group" aria-label="Range" style={{ width: 150 }}>
          <button aria-pressed={range === 7} onClick={() => setRange(7)}>
            7 days
          </button>
          <button aria-pressed={range === 30} onClick={() => setRange(30)}>
            30 days
          </button>
        </div>
      </div>
      <div className="card">
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          Working sets {range === 30 ? 'per week (30-day average)' : 'this past week'}. Secondary muscles count as half a set. Shaded band: the 10–20 sets/week most
          lifters grow on.
        </p>
        <div className="stack-sm">
          {rows.map(({ m, n }) => (
            <div className="hbar-row" key={m}>
              <span className="secondary">{MUSCLE_LABELS[m]}</span>
              <div className="hbar-track">
                <div className="band" style={{ left: `${(BAND[0] / max) * 100}%`, width: `${((BAND[1] - BAND[0]) / max) * 100}%` }} />
                {n > 0 && <div className="fill" style={{ width: `${(n / max) * 100}%` }} />}
              </div>
              <span className="tabular" style={{ textAlign: 'right', fontWeight: 650 }}>
                {trimNumber(n)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecordsSection() {
  const workouts = useStore((s) => s.workouts);
  const unit = useStore((s) => s.settings.unit);
  const { byId } = useExercises();
  const records = useMemo(() => {
    const usage = exerciseUsage(workouts);
    return [...usage.keys()]
      .map((id) => byId.get(id))
      .filter((e) => e && e.type === 'weight_reps')
      .map((e) => ({ exercise: e!, rec: exerciseRecords(workouts, e!), last: usage.get(e!.id)!.last }))
      .filter((r) => r.rec.bestE1RM > 0)
      .sort((a, b) => b.rec.sessions - a.rec.sessions)
      .slice(0, 8);
  }, [workouts, byId]);

  if (!records.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Top lifts</h2>
        <span className="small muted">Est. 1RM</span>
      </div>
      <div className="list">
        {records.map(({ exercise, rec, last }) => (
          <Link to={`/exercises/${exercise.id}`} className="list-item" key={exercise.id}>
            <div className="grow">
              <div style={{ fontWeight: 600 }} className="truncate">
                {exercise.name}
              </div>
              <div className="small muted">
                {rec.sessions} sessions · last {relativeDayInline(last)}
                {last < addDays(Date.now(), -SCORE_WINDOW_DAYS) ? ' · not in score' : ''}
              </div>
            </div>
            <span className="tabular" style={{ fontWeight: 700 }}>
              {formatWeight(rec.bestE1RM, unit)}
            </span>
            <ChevronRight size={18} className="chev" />
          </Link>
        ))}
      </div>
    </section>
  );
}
