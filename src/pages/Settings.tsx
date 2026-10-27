import { Bell, CalendarCheck, ChevronRight, Disc3, FileInput, Download, FileSpreadsheet, Footprints, Moon, Ruler, Target, Timer, Trash2, Upload, User, Zap } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { confirm, toast } from '../components/Dialogs';
import { PageHeader } from '../components/Layout';
import { SyncSettings } from '../components/SyncSettings';
import { downloadFile, makeBackup, parseBackup, workoutsToCsv } from '../lib/backup';
import { toDateInput } from '../lib/dates';
import { BAR_OPTIONS, defaultBarKg } from '../lib/progression';
import { formatDuration, fromKg, toKg } from '../lib/units';
import { useExercises, useStore } from '../store/useStore';
import type { Settings as SettingsType } from '../types';

/** Rounded-square icon in a solid colour, like the iOS Settings app. */
function IconTile({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="icon-tile" style={{ background: color }} aria-hidden>
      {children}
    </span>
  );
}

function Row({ icon, label, hint, children }: { icon: ReactNode; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="list-item" style={{ minHeight: 52 }}>
      {icon}
      <div className="grow">
        <div className="title">{label}</div>
        {hint && <div className="sub">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ minWidth: 132 }}>
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

const compactSelect = { width: 'auto', minHeight: 34, padding: '4px 30px 4px 12px', fontFamily: 'var(--font-rounded)', fontWeight: 600 } as const;

export function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const replaceAll = useStore((s) => s.replaceAll);
  const resetAll = useStore((s) => s.resetAll);
  const workoutCount = useStore((s) => s.workouts.length);
  const routineCount = useStore((s) => s.routines.length);
  const { byId } = useExercises();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof SettingsType>(k: K) => (v: SettingsType[K]) => update({ [k]: v } as Partial<SettingsType>);

  const exportJson = () => {
    const s = useStore.getState();
    downloadFile(`forge-backup-${toDateInput(Date.now())}.json`, JSON.stringify(makeBackup(s)), 'application/json');
  };

  const exportCsv = () => {
    downloadFile(`forge-workouts-${toDateInput(Date.now())}.csv`, workoutsToCsv(useStore.getState(), byId, settings.unit), 'text/csv');
  };

  const importJson = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const ok = await confirm({
        title: 'Restore backup?',
        message: `This replaces everything on this device with ${data.workouts?.length ?? 0} workouts and ${data.routines?.length ?? 0} routines from the file.`,
        confirmLabel: 'Restore',
        danger: true,
      });
      if (ok) {
        replaceAll(data);
        toast('Backup restored');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Delete all data?',
      message: 'Every workout, routine and bodyweight entry will be erased, including your synced copy if you are signed in. Export a backup first if you want to keep them.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (ok) {
      resetAll();
      toast('All data deleted');
    }
  };

  return (
    <div className="page">
      <PageHeader back title="Settings" />

      <div className="list-header">Account & sync</div>
      <SyncSettings IconTile={IconTile} />


      <div className="list-header" style={{ marginTop: 28 }}>
        Units & profile
      </div>
      <div className="list with-small-icons">
        <Row icon={<IconTile color="var(--accent)"><Ruler size={17} /></IconTile>} label="Weight unit">
          <Seg label="Weight unit" value={settings.unit} options={[['lb', 'lb'], ['kg', 'kg']]} onChange={set('unit')} />
        </Row>
        <Row icon={<IconTile color="var(--m-back)"><User size={17} /></IconTile>} label="Strength standards">
          <Seg label="Strength standards" value={settings.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={set('sex')} />
        </Row>
        <Row icon={<IconTile color="var(--m-legs)"><CalendarCheck size={17} /></IconTile>} label="Weekly goal">
          <select className="select" style={compactSelect} value={settings.weeklyGoal} onChange={(e) => update({ weeklyGoal: Number(e.target.value) })} aria-label="Weekly goal">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} / week
              </option>
            ))}
          </select>
        </Row>
        <Row icon={<IconTile color="var(--green)"><Footprints size={17} /></IconTile>} label="Daily step goal">
          <select className="select" style={compactSelect} value={settings.stepGoal} onChange={(e) => update({ stepGoal: Number(e.target.value) })} aria-label="Daily step goal">
            {[...new Set([...Array.from({ length: 24 }, (_, i) => (i + 2) * 1000), settings.stepGoal])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()}
                </option>
              ))}
          </select>
        </Row>
      </div>
      <div className="list-footer">Standards set what counts as intermediate for your strength score. Steps come from Apple Health via a Shortcut; tap the Steps card on Home to set it up.</div>

      <div className="list-header" style={{ marginTop: 28 }}>
        Training
      </div>
      <div className="list with-small-icons">
        <Row icon={<IconTile color="var(--accent-2)"><Target size={17} /></IconTile>} label="Smart targets">
          <Switch label="Smart targets" checked={settings.smartSuggestions} onChange={set('smartSuggestions')} />
        </Row>
        <Row icon={<IconTile color="#8e8e93"><Disc3 size={17} /></IconTile>} label="Barbell weight">
          <select
            className="select"
            style={compactSelect}
            value={Math.round(fromKg(settings.barKg ?? defaultBarKg(settings.unit), settings.unit))}
            onChange={(e) => update({ barKg: toKg(Number(e.target.value), settings.unit) })}
            aria-label="Barbell weight"
          >
            {[...new Set([...BAR_OPTIONS[settings.unit], Math.round(fromKg(settings.barKg ?? defaultBarKg(settings.unit), settings.unit))])]
              .sort((a, b) => b - a)
              .map((b) => (
                <option key={b} value={b}>
                  {b} {settings.unit}
                </option>
              ))}
          </select>
        </Row>
      </div>
      <div className="list-footer">Smart targets suggest today's weight and reps from your last session. The bar weight is used for warm-ups and the plate calculator.</div>

      <div className="list-header" style={{ marginTop: 28 }}>
        Rest timer
      </div>
      <div className="list with-small-icons">
        <Row icon={<IconTile color="var(--m-shoulders)"><Zap size={17} /></IconTile>} label="Start automatically">
          <Switch label="Start rest timer automatically" checked={settings.autoRestTimer} onChange={set('autoRestTimer')} />
        </Row>
        <Row icon={<IconTile color="var(--m-cardio)"><Timer size={17} /></IconTile>} label="Default rest">
          <select className="select" style={compactSelect} value={settings.defaultRestSec} onChange={(e) => update({ defaultRestSec: Number(e.target.value) })} aria-label="Default rest">
            {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {formatDuration(s)}
              </option>
            ))}
          </select>
        </Row>
        <Row icon={<IconTile color="var(--m-chest)"><Bell size={17} /></IconTile>} label="Sound">
          <Switch label="Rest timer sound" checked={settings.restSound} onChange={set('restSound')} />
        </Row>
      </div>
      <div className="list-footer">The timer starts when you tick a set and beeps when rest is over.</div>

      <div className="list-header" style={{ marginTop: 28 }}>
        Appearance
      </div>
      <div className="list with-small-icons">
        <Row icon={<IconTile color="#636366"><Moon size={17} /></IconTile>} label="Theme">
          <Seg label="Theme" value={settings.theme} options={[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} onChange={set('theme')} />
        </Row>
      </div>

      <div className="list-header" style={{ marginTop: 28 }}>
        Your data
      </div>
      <div className="list with-small-icons">
        <button className="list-item" onClick={exportJson}>
          <IconTile color="var(--m-legs)">
            <Download size={17} />
          </IconTile>
          <span className="grow title">Export backup</span>
        </button>
        <button className="list-item" onClick={() => fileRef.current?.click()}>
          <IconTile color="var(--accent)">
            <Upload size={17} />
          </IconTile>
          <span className="grow title">Restore from backup</span>
        </button>
        <Link to="/import" className="list-item">
          <IconTile color="var(--m-shoulders)">
            <FileInput size={17} />
          </IconTile>
          <span className="grow title">Import from another app</span>
          <ChevronRight size={18} className="chev" />
        </Link>
        <button className="list-item" onClick={exportCsv}>
          <IconTile color="var(--m-arms)">
            <FileSpreadsheet size={17} />
          </IconTile>
          <span className="grow title">Export workouts as CSV</span>
        </button>
      </div>
      <div className="list-footer">
        Everything is stored on this device ({workoutCount} workouts, {routineCount} routines). Export a backup regularly, or to move to another phone.
      </div>

      <div className="list" style={{ marginTop: 28 }}>
        <button className="list-item" style={{ color: 'var(--red)', justifyContent: 'center', minHeight: 50 }} onClick={reset}>
          <Trash2 size={18} /> Delete all data
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importJson(f);
          e.target.value = '';
        }}
      />

      <p className="tiny faint" style={{ textAlign: 'center', marginTop: 32 }}>
        Forge · workout tracker
      </p>
    </div>
  );
}
