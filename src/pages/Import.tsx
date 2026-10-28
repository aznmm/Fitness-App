import { AlertTriangle, ChevronDown, ChevronRight, FileUp, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Dialogs';
import { ExerciseTile, ExercisePicker } from '../components/ExercisePicker';
import { PageHeader } from '../components/Layout';
import { Sheet } from '../components/Sheet';
import { formatDate } from '../lib/dates';
import { uid } from '../lib/id';
import {
  buildWorkouts,
  detectColumns,
  FIELD_LABELS,
  guessDateOrder,
  guessExerciseDetails,
  guessType,
  matchExercise,
  missingRequired,
  parseCsv,
  toAppWorkouts,
  withoutDuplicates,
  type ColumnMap,
  type CsvTable,
  type DateOrder,
  type Detection,
  type DistanceUnit,
  type Field,
  type MatchConfidence,
} from '../lib/importCsv';
import { useExercises, useStore } from '../store/useStore';
import type { Exercise, Unit } from '../types';

/** Imported name → library exercise id, or 'new' to create a custom exercise. */
type Mapping = Record<string, { id: string | 'new'; confidence: MatchConfidence }>;

const FORMAT_LABEL = { strong: 'Strong', hevy: 'Hevy', generic: 'Spreadsheet' } as const;
const EDITABLE_FIELDS: Field[] = ['date', 'workoutName', 'exercise', 'setOrder', 'setType', 'weight', 'reps', 'distance', 'seconds', 'endTime', 'workoutDuration', 'notes'];

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Import() {
  const navigate = useNavigate();
  const appUnit = useStore((s) => s.settings.unit);
  const existing = useStore((s) => s.workouts);
  const importWorkouts = useStore((s) => s.importWorkouts);
  const { list: library, byId } = useExercises();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<CsvTable | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [columns, setColumns] = useState<ColumnMap>({});
  const [weightUnit, setWeightUnit] = useState<Unit>(appUnit);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(appUnit === 'lb' ? 'mi' : 'km');
  const [dateOrder, setDateOrder] = useState<DateOrder>('mdy');
  const [mapping, setMapping] = useState<Mapping>({});
  const [showColumns, setShowColumns] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async (file: File) => {
    setError('');
    try {
      const t = parseCsv(await file.text());
      if (!t.rows.length) throw new Error('That file has no rows.');
      const d = detectColumns(t.header);
      setFileName(file.name);
      setTable(t);
      setDetection(d);
      setColumns(d.columns);
      if (d.weightUnit) setWeightUnit(d.weightUnit);
      if (d.distanceUnit) setDistanceUnit(d.distanceUnit);
      const dateCol = d.columns.date;
      setDateOrder(dateCol !== undefined ? guessDateOrder(t.rows.slice(0, 500).map((r) => r[dateCol] ?? '')) : 'mdy');
      setShowColumns(missingRequired(d.columns).length > 0);
      setMapping({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  const missing = useMemo(() => missingRequired(columns), [columns]);
  const result = useMemo(
    () => (table && !missing.length ? buildWorkouts(table, columns, { weightUnit, distanceUnit, dateOrder }) : null),
    [table, columns, weightUnit, distanceUnit, dateOrder, missing],
  );

  // Unique exercise names with set counts, plus automatic matches (user edits win).
  const names = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of result?.workouts ?? []) for (const e of w.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + e.sets.length);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [result]);
  const resolved: Mapping = useMemo(() => {
    const out: Mapping = {};
    for (const [name] of names) {
      if (mapping[name]) out[name] = mapping[name];
      else {
        const m = matchExercise(name, library);
        out[name] = { id: m.exercise?.id ?? 'new', confidence: m.confidence };
      }
    }
    return out;
  }, [names, mapping, library]);

  const totalSets = names.reduce((n, [, c]) => n + c, 0);
  const workouts = result?.workouts ?? [];
  const fresh = useMemo(() => withoutDuplicates(toAppWorkouts(workouts, () => ''), existing).length, [workouts, existing]);
  const newCount = names.filter(([n]) => resolved[n].id === 'new').length;
  const checkCount = names.filter(([n]) => resolved[n].confidence === 'fuzzy' && !mapping[n]).length;

  const doImport = () => {
    if (!result) return;
    const created: Exercise[] = [];
    const idFor = new Map<string, string>();
    for (const [name] of names) {
      const r = resolved[name];
      if (r.id !== 'new') idFor.set(name, r.id);
      else {
        const sets = result.workouts.flatMap((w) => w.exercises.filter((e) => e.name === name).flatMap((e) => e.sets));
        const ex: Exercise = { id: `custom-${uid()}`, name, secondary: [], type: guessType(sets), custom: true, ...guessExerciseDetails(name) };
        created.push(ex);
        idFor.set(name, ex.id);
      }
    }
    const incoming = withoutDuplicates(toAppWorkouts(result.workouts, (n) => idFor.get(n)!), existing);
    importWorkouts(incoming, created);
    toast(`Imported ${incoming.length} workout${incoming.length === 1 ? '' : 's'}`);
    navigate('/progress?view=history', { replace: true });
  };

  return (
    <div className="page no-tabs">
      <PageHeader back="/settings" title="Import history" />

      {!table ? (
        <>
          <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div className="empty-icon" style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: 20, background: 'var(--accent-tint)', color: 'var(--accent)' }}>
              <FileUp size={30} />
            </div>
            <h3 style={{ marginTop: 12 }}>Bring your workouts with you</h3>
            <p className="small muted" style={{ margin: '6px auto 18px', maxWidth: 320 }}>
              Export your workout history as a CSV file from your old app, then choose it here. Strong and Hevy exports are recognised automatically. Other
              spreadsheets work too: you can match the columns yourself.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </button>
            {error && (
              <p className="small" style={{ color: 'var(--red)', marginTop: 12 }}>
                {error}
              </p>
            )}
          </div>
          <p className="tiny muted" style={{ textAlign: 'center', marginTop: 12 }}>
            Your file stays on this device. Nothing is uploaded.
          </p>
        </>
      ) : (
        <>
          <div className="card">
            <div className="spread">
              <div className="grow">
                <div className="card-title truncate">{fileName}</div>
                <div className="small muted">{detection && `${FORMAT_LABEL[detection.format]} export · ${table.rows.length} rows`}</div>
              </div>
              <button className="btn btn-sm btn-tinted" onClick={() => fileRef.current?.click()}>
                Change
              </button>
            </div>
            {result && (
              <>
                <div className="divider" />
                <div className="metrics">
                  <div className="metric">
                    <div className="label">Workouts</div>
                    <div className="value">{workouts.length}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Sets</div>
                    <div className="value">{totalSets}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Exercises</div>
                    <div className="value">{names.length}</div>
                  </div>
                </div>
                {workouts.length > 0 && (
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {formatDate(workouts[0].startedAt, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
                    {formatDate(workouts[workouts.length - 1].startedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                {(result.badDates > 0 || result.skippedRows > 0) && (
                  <div className="small" style={{ color: 'var(--gold)', marginTop: 8 }}>
                    {result.badDates > 0 && `${result.badDates} rows had a date we couldn't read. `}
                    {result.skippedRows > 0 && `${result.skippedRows} empty rows skipped.`}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="list-header" style={{ marginTop: 24 }}>
            Units
          </div>
          <div className="list">
            <div className="list-item">
              <span className="grow title">Weights in file</span>
              <Seg label="Weight unit in file" value={weightUnit} options={[['lb', 'lb'], ['kg', 'kg']]} onChange={setWeightUnit} />
            </div>
            {columns.distance !== undefined && (
              <div className="list-item">
                <span className="grow title">Distances in file</span>
                <Seg label="Distance unit in file" value={distanceUnit} options={[['mi', 'mi'], ['km', 'km'], ['m', 'm']]} onChange={setDistanceUnit} />
              </div>
            )}
            <div className="list-item">
              <span className="grow title">Dates like 03/04</span>
              <Seg label="Date order" value={dateOrder} options={[['mdy', 'Mar 4'], ['dmy', '3 Apr']]} onChange={setDateOrder} />
            </div>
          </div>
          {detection && !detection.weightUnit && (
            <div className="list-footer">The file doesn't say which unit it uses. Check this matches your old app's setting.</div>
          )}

          <button className="btn btn-ghost" style={{ marginTop: 16, paddingLeft: 4 }} onClick={() => setShowColumns(!showColumns)}>
            {showColumns ? <ChevronDown size={18} /> : <ChevronRight size={18} />} Columns
            {missing.length > 0 && <span className="badge" style={{ background: 'var(--red-tint)', color: 'var(--red)' }}>Needs attention</span>}
          </button>
          {showColumns && (
            <>
              <div className="list">
                {EDITABLE_FIELDS.map((f) => (
                  <label className="list-item" key={f} style={{ minHeight: 50 }}>
                    <span className="grow title">
                      {FIELD_LABELS[f]}
                      {missing.includes(f) && <span style={{ color: 'var(--red)' }}> *</span>}
                    </span>
                    <select
                      className="select"
                      style={{ width: 'auto', maxWidth: 180, minHeight: 34, padding: '4px 30px 4px 12px' }}
                      value={columns[f] ?? -1}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setColumns((c) => ({ ...c, [f]: v < 0 ? undefined : v }));
                      }}
                    >
                      <option value={-1}>Not in file</option>
                      {table.header.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {missing.length > 0 && (
                <div className="list-footer" style={{ color: 'var(--red)' }}>
                  Pick a column for: {missing.map((f) => (f === 'reps' ? 'reps, time or distance' : FIELD_LABELS[f].toLowerCase())).join(', ')}.
                </div>
              )}
            </>
          )}

          {names.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 24 }}>
                <h2>Exercises</h2>
                {checkCount > 0 && (
                  <span className="badge gold">
                    <AlertTriangle size={12} /> {checkCount} to check
                  </span>
                )}
              </div>
              <p className="small muted" style={{ margin: '-4px 0 12px' }}>
                Tap any row to change what it maps to. Unmatched exercises are added as new custom exercises.
              </p>
              <div className="list with-icons">
                {names.map(([name, count]) => {
                  const r = resolved[name];
                  const ex = r.id === 'new' ? undefined : byId.get(r.id);
                  return (
                    <button className="list-item" key={name} onClick={() => setEditing(name)}>
                      {ex ? (
                        <ExerciseTile exercise={ex} />
                      ) : (
                        <div className="tile">
                          <Plus size={20} />
                        </div>
                      )}
                      <div className="grow">
                        <div className="title truncate">{name}</div>
                        <div className="sub truncate">
                          {ex ? `→ ${ex.name}` : '→ New custom exercise'} · {count} set{count === 1 ? '' : 's'}
                        </div>
                      </div>
                      {r.confidence === 'fuzzy' && !mapping[name] && <span className="badge gold">Check</span>}
                      <ChevronRight size={18} className="chev" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="stack" style={{ marginTop: 24 }}>
            <button className="btn btn-primary btn-lg btn-block" disabled={!result || fresh === 0} onClick={doImport}>
              {fresh === 0 && workouts.length > 0 ? 'Already imported' : `Import ${fresh} workout${fresh === 1 ? '' : 's'}`}
            </button>
            {result && workouts.length > fresh && fresh > 0 && (
              <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
                {workouts.length - fresh} already in your history will be skipped.
              </p>
            )}
            {newCount > 0 && (
              <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
                {newCount} new custom exercise{newCount === 1 ? '' : 's'} will be created.
              </p>
            )}
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
          e.target.value = '';
        }}
      />

      {editing && (
        <Sheet title={editing} onClose={() => setEditing(null)}>
          <div className="menu">
            <button
              onClick={() => {
                setMapping((m) => ({ ...m, [editing]: { id: 'new', confidence: 'exact' } }));
                setEditing(null);
              }}
            >
              <Plus size={18} /> Create as a new exercise
            </button>
            <button
              onClick={() => {
                setPicking(editing);
                setEditing(null);
              }}
            >
              <Search size={18} /> Choose from library…
            </button>
          </div>
        </Sheet>
      )}
      {picking && (
        <ExercisePicker
          title={`Map “${picking}”`}
          multi={false}
          onClose={() => setPicking(null)}
          onPick={([id]) => {
            setMapping((m) => ({ ...m, [picking]: { id, confidence: 'exact' } }));
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
