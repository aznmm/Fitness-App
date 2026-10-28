import { ChevronRight, CircleCheck, Clock, Flame, Info, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BodyMap, HeatLegend, heatColor, heatStep } from '../components/BodyMap';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { ExerciseTile } from '../components/ExercisePicker';
import { PageHeader } from '../components/Layout';
import { MuscleIcon } from '../components/MuscleIcon';
import { Sheet } from '../components/Sheet';
import { ScoreRing } from '../components/ScoreRing';
import { formatSteps, StepsSheet } from '../components/Steps';
import { ScoreDelta } from '../components/StrengthScoreCard';
import { MUSCLE_LABELS } from '../data/exercises';
import { exerciseRecords, workoutDurationMs, workoutVolume } from '../lib/calc';
import { DAY_MS, addDays, formatDate, fromDateInput, relativeDay, relativeDayInline, toDateInput } from '../lib/dates';
import { groupFatigue, MAP_MUSCLES, muscleFatigue, muscleSets, type RecoveryStatus } from '../lib/muscles';
import { exerciseUsage, finished, setsPerMuscle, VOLUME_MUSCLES, weekStreak, weeklyStats } from '../lib/stats';
import { recentSteps } from '../lib/steps';
import { GAUGE_MAX, GROUP_LABELS, LEVELS, levelFor, SCORE_WINDOW_DAYS, STRENGTH_GROUPS } from '../lib/strength';
import { formatElapsed, formatVolume, formatWeight, fromKg, toKg, trimNumber } from '../lib/units';
import { useStrength } from '../lib/useStrength';
import { exerciseName, useBodyweight, useExercises, useStore } from '../store/useStore';
import type { Muscle, StrengthGroup } from '../types';
import { HistoryView } from './History';

/** Dashboard: an overview of training, steps and strength, plus the full workout history. */
export function Progress() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'history' ? 'history' : 'overview';
  const show = (v: typeof view) => setParams(v === 'history' ? { view: v } : {}, { replace: true });

  return (
    <div className="page">
      <PageHeader title="Progress" />
      <div className="seg" role="group" aria-label="Progress view" style={{ marginBottom: 20 }}>
        <button aria-pressed={view === 'overview'} onClick={() => show('overview')}>
          Overview
        </button>
        <button aria-pressed={view === 'history'} onClick={() => show('history')}>
          History
        </button>
      </div>
      {view === 'history' ? (
        <HistoryView />
      ) : (
        <>
          <SummarySection />
          <StrengthSection />
          <StepsSection />
          <WeeklySection />
          <MuscleSection />
          <BodyweightSection />
          <RecordsSection />
        </>
      )}
    </div>
  );
}

/** Last 30 days at a glance. */
function SummarySection() {
  const workouts = useStore((s) => s.workouts);
  const steps = useStore((s) => s.steps);
  const unit = useStore((s) => s.settings.unit);
  const stats = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const recent = finished(workouts).filter((w) => w.startedAt >= since);
    const week = recentSteps(steps, 7).filter((d) => d.logged);
    return {
      workouts: recent.length,
      volume: recent.reduce((a, w) => a + workoutVolume(w), 0),
      time: recent.reduce((a, w) => a + workoutDurationMs(w), 0),
      streak: weekStreak(workouts),
      steps: week.length ? week.reduce((a, d) => a + d.count, 0) / week.length : undefined,
    };
  }, [workouts, steps]);

  return (
    <section style={{ marginBottom: 12 }}>
      <div className="stat-grid two">
        <div className="stat">
          <div className="label">Workouts · 30 days</div>
          <div className="value">{stats.workouts}</div>
        </div>
        <div className="stat">
          <div className="label">Time · 30 days</div>
          <div className="value">{stats.time ? formatElapsed(stats.time) : '–'}</div>
        </div>
        <div className="stat">
          <div className="label">Week streak</div>
          <div className="value">
            {stats.streak}
            <small>{stats.streak === 1 ? 'week' : 'weeks'}</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">Steps · 7-day avg</div>
          <div className="value">{stats.steps !== undefined ? formatSteps(stats.steps) : '–'}</div>
        </div>
      </div>
      {stats.volume > 0 && (
        <p className="tiny muted" style={{ margin: '8px 4px 0' }}>
          {formatVolume(stats.volume, unit)} lifted in the last month.
        </p>
      )}
    </section>
  );
}

function StepsSection() {
  const entries = useStore((s) => s.steps);
  const goal = useStore((s) => s.settings.stepGoal);
  const [range, setRange] = useState<7 | 30>(7);
  const [open, setOpen] = useState(false);
  const days = useMemo(() => recentSteps(entries, range), [entries, range]);
  if (!entries.length) return null;
  const logged = days.filter((d) => d.logged);
  const avg = logged.length ? logged.reduce((a, d) => a + d.count, 0) / logged.length : 0;
  const hit = logged.filter((d) => d.count >= goal).length;

  return (
    <section className="section">
      <div className="section-head">
        <h2>Steps</h2>
        <button className="link-btn" onClick={() => setOpen(true)}>
          Update
        </button>
      </div>
      <div className="card">
        <div className="spread" style={{ marginBottom: 10 }}>
          <div>
            <div className="step-count">{formatSteps(avg)}</div>
            <div className="small muted">
              a day on average · goal hit {hit} of {logged.length} day{logged.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="seg" role="group" aria-label="Steps range">
            <button aria-pressed={range === 7} onClick={() => setRange(7)}>
              7D
            </button>
            <button aria-pressed={range === 30} onClick={() => setRange(30)}>
              30D
            </button>
          </div>
        </div>
        <BarChart
          label={`Daily steps, last ${range} days`}
          goal={goal}
          bars={days.map((d) => ({
            key: d.date,
            tick: range === 7 ? formatDate(d.date, { weekday: 'narrow' }) : formatDate(d.date, { month: 'numeric', day: 'numeric' }),
            value: d.count,
            title: relativeDay(d.date),
          }))}
        />
      </div>
      {open && <StepsSheet onClose={() => setOpen(false)} />}
    </section>
  );
}

/** The muscle drawn on each strength group's tile. */
const GROUP_ICON: Record<StrengthGroup, Muscle> = { chest: 'chest', back: 'lats', shoulders: 'shoulders', arms: 'biceps', legs: 'quads' };

function StrengthSection() {
  const { current, history, change, bodyweight } = useStrength();
  const { byId } = useExercises();
  const [info, setInfo] = useState(false);

  return (
    <section>
      <div className="card" style={{ position: 'relative', textAlign: 'center', paddingTop: 24 }}>
        <button
          className="glass-btn"
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, color: 'var(--text-2)' }}
          aria-label="How the strength score works"
          onClick={() => setInfo(true)}
        >
          <Info size={18} />
        </button>
        {current.overall === null ? (
          <>
            <div style={{ display: 'inline-block' }}>
              <ScoreRing progress={0} size={150} stroke={16} label="Strength score not available yet">
                <span className="score muted" style={{ fontSize: 40 }}>
                  –
                </span>
              </ScoreRing>
            </div>
            <p className="secondary" style={{ margin: '16px auto 4px', maxWidth: 300 }}>
              {bodyweight
                ? 'Log a main lift — bench, squat, deadlift, rows, presses, curls — to calculate your score.'
                : 'Add your bodyweight below. The score compares your lifts to your bodyweight.'}
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-block' }}>
              <ScoreRing progress={current.overall / GAUGE_MAX} size={184} stroke={18} label={`Strength score ${Math.round(current.overall)}`}>
                <div>
                  <div className="score" style={{ fontSize: 56 }}>
                    {Math.round(current.overall)}
                  </div>
                  <div className="small muted" style={{ fontWeight: 600, marginTop: 4 }}>
                    Strength score
                  </div>
                </div>
              </ScoreRing>
            </div>
            <div className="level-name" style={{ fontSize: 26, marginTop: 14 }}>
              {levelFor(current.overall).name}
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 4, minHeight: 20 }}>
              <ScoreDelta change={change} />
            </div>
            {history.length >= 2 && (
              <div style={{ marginTop: 18, textAlign: 'left' }}>
                <LineChart
                  points={history.map((p) => ({ x: p.date, y: Math.round(p.score) }))}
                  label="Strength score, last 12 weeks"
                  formatY={(v) => String(Math.round(v))}
                  formatX={(x) => formatDate(x)}
                  formatXLong={(x) => `Week of ${formatDate(x)}`}
                  height={140}
                />
              </div>
            )}
          </>
        )}
      </div>

      {current.overall !== null && (
        <section className="section">
          <div className="section-head">
            <h2>Strength balance</h2>
            <span className="small muted">Last {SCORE_WINDOW_DAYS} days</span>
          </div>
          <div className="list with-icons">
            {STRENGTH_GROUPS.map((g) => {
              const gs = current.groups[g];
              return (
                <div key={g} className={`list-item m-${g}`} style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
                  <div className={`tile m-${g}`}>
                    <MuscleIcon muscle={GROUP_ICON[g]} size={32} />
                  </div>
                  <div className="grow">
                    <div className="spread">
                      <span className="title">{GROUP_LABELS[g]}</span>
                      {gs ? (
                        <span>
                          <span className="rounded-num" style={{ fontWeight: 700, fontSize: 17 }}>
                            {Math.round(gs.score)}
                          </span>{' '}
                          <span className="small muted">{levelFor(gs.score).name}</span>
                        </span>
                      ) : (
                        <span className="small muted">No data</span>
                      )}
                    </div>
                    <div className="meter" style={{ marginTop: 8 }} aria-hidden>
                      <div style={{ width: `${gs ? Math.min(100, (gs.score / GAUGE_MAX) * 100) : 0}%` }} />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 6 }}>
                      {gs ? exerciseName(byId, gs.exerciseId) : 'Log a main lift for this group'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
          <button className="btn btn-primary" type="submit" disabled={!(Number(value.replace(',', '.')) > 0)} style={{ minHeight: 46 }}>
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
              <div className="spread small" key={e.id} style={{ padding: '4px 0', boxShadow: '0 -0.5px 0 var(--separator)' }}>
                <span className="secondary">{relativeDay(e.date)}</span>
                <span className="row">
                  <span className="rounded-num" style={{ fontWeight: 600, fontSize: 15 }}>
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
      <div className="seg" role="group" aria-label="Weekly metric" style={{ marginBottom: 12 }}>
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

const STATUS_META: Record<RecoveryStatus, { label: string; color: string; icon: typeof CircleCheck }> = {
  fresh: { label: 'Fresh', color: 'var(--green-text)', icon: CircleCheck },
  recovering: { label: 'Recovering', color: 'var(--gold)', icon: Clock },
  fatigued: { label: 'Fatigued', color: 'var(--heat)', icon: Flame },
};

function MuscleSection() {
  const workouts = useStore((s) => s.workouts);
  const { byId } = useExercises();
  const [mode, setMode] = useState<'sets' | 'recovery'>('sets');
  const [range, setRange] = useState<7 | 30>(7);
  const since = useMemo(() => Date.now() - range * DAY_MS, [range]);
  const sets = useMemo(() => setsPerMuscle(workouts, byId, since), [workouts, byId, since]);
  const raw = useMemo(() => muscleSets(workouts, byId, since), [workouts, byId, since]);
  const fatigue = useMemo(() => muscleFatigue(workouts, byId), [workouts, byId]);
  const perWeek = (n: number) => (range === 7 ? n : (n / 30) * 7);
  const rows = VOLUME_MUSCLES.map((m) => ({ m, n: perWeek(sets[m]) }));
  const max = Math.max(22, ...rows.map((r) => r.n));
  const BAND = [10, 20];
  const mapValues =
    mode === 'sets' ? Object.fromEntries(MAP_MUSCLES.map((m) => [m, Math.min(1, perWeek(raw[m] ?? 0) / 20)])) : fatigue;

  return (
    <section className="section">
      <div className="section-head">
        <h2>Muscles</h2>
        <div className="seg" role="group" aria-label="Muscle view">
          <button aria-pressed={mode === 'sets'} onClick={() => setMode('sets')}>
            Sets
          </button>
          <button aria-pressed={mode === 'recovery'} onClick={() => setMode('recovery')}>
            Recovery
          </button>
        </div>
      </div>
      <div className="card">
        <BodyMap
          values={mapValues}
          height={250}
          label={mode === 'sets' ? 'Working sets per muscle' : 'Muscle fatigue right now'}
        />
        {mode === 'sets' ? (
          <>
            <div style={{ marginTop: 12 }}>
              <HeatLegend none="None" low="1 set" high="15+ sets a week" />
            </div>
            <div className="divider" />
            <div className="spread" style={{ marginBottom: 12 }}>
              <span className="small muted">{range === 30 ? 'Sets per week, 30-day average' : 'Sets in the last 7 days'}</span>
              <div className="seg" role="group" aria-label="Range">
                <button aria-pressed={range === 7} onClick={() => setRange(7)}>
                  7 days
                </button>
                <button aria-pressed={range === 30} onClick={() => setRange(30)}>
                  30 days
                </button>
              </div>
            </div>
            <div className="stack-sm" style={{ gap: 8 }}>
              {rows.map(({ m, n }) => (
                <div className="hbar-row" key={m}>
                  <span>{MUSCLE_LABELS[m]}</span>
                  <div className="hbar-track">
                    <div className="band" style={{ left: `${(BAND[0] / max) * 100}%`, width: `${((BAND[1] - BAND[0]) / max) * 100}%` }} />
                    {n > 0 && <div className="fill" style={{ width: `${(n / max) * 100}%`, background: heatColor(heatStep(n / 20)) }} />}
                  </div>
                  <span className="rounded-num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {trimNumber(n)}
                  </span>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ margin: '12px 0 0' }}>
              Secondary muscles count as half a set. Shaded band: the 10–20 sets a week most lifters grow on.
            </p>
          </>
        ) : (
          <RecoveryList fatigue={fatigue} />
        )}
      </div>
    </section>
  );
}

function RecoveryList({ fatigue }: { fatigue: Partial<Record<Muscle, number>> }) {
  return (
    <>
      <div style={{ marginTop: 12 }}>
        <HeatLegend none="Recovered" low="Recovering" high="Just trained" />
      </div>
      <div className="divider" />
      <div className="stack-sm" style={{ gap: 10 }}>
        {groupFatigue(fatigue).map((g) => {
          const meta = STATUS_META[g.status];
          const Icon = meta.icon;
          return (
            <div className="spread" key={g.id}>
              <span style={{ fontWeight: 500 }}>{g.label}</span>
              <span className="row small" style={{ gap: 6, color: meta.color, fontWeight: 600 }}>
                <Icon size={15} /> {meta.label}
                <span className="rounded-num muted" style={{ fontWeight: 500, minWidth: 44, textAlign: 'right' }}>
                  {Math.round((1 - g.fatigue) * 100)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="tiny muted" style={{ margin: '12px 0 0' }}>
        Estimated from your recent sets. Most muscles are fully recovered 2–3 days after a hard session.
      </p>
    </>
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
      <div className="list with-icons">
        {records.map(({ exercise, rec, last }) => (
          <Link to={`/exercises/${exercise.id}`} className="list-item" key={exercise.id}>
            <ExerciseTile exercise={exercise} />
            <div className="grow">
              <div className="title truncate">{exercise.name}</div>
              <div className="sub truncate">
                {rec.sessions} sessions · last {relativeDayInline(last)}
                {last < addDays(Date.now(), -SCORE_WINDOW_DAYS) ? ' · not in score' : ''}
              </div>
            </div>
            <span className="rounded-num" style={{ fontWeight: 700, fontSize: 17 }}>
              {formatWeight(rec.bestE1RM, unit)}
            </span>
            <ChevronRight size={18} className="chev" />
          </Link>
        ))}
      </div>
    </section>
  );
}
