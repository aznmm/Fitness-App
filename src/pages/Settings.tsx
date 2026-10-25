import { Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { confirm, toast } from '../components/Dialogs';
import { PageHeader } from '../components/Layout';
import { downloadFile, makeBackup, parseBackup, workoutsToCsv } from '../lib/backup';
import { toDateInput } from '../lib/dates';
import { formatDuration } from '../lib/units';
import { useExercises, useStore } from '../store/useStore';
import type { Settings as SettingsType } from '../types';

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="list-item">
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ minWidth: 140 }}>
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
      message: 'Every workout, routine and bodyweight entry on this device will be erased. Export a backup first if you want to keep them.',
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

      <div className="small muted" style={{ fontWeight: 700, margin: '8px 0 6px' }}>
        UNITS & PROFILE
      </div>
      <div className="list">
        <Row label="Weight unit">
          <Seg label="Weight unit" value={settings.unit} options={[['lb', 'lb'], ['kg', 'kg']]} onChange={set('unit')} />
        </Row>
        <Row label="Strength standards" hint="Used for your strength score">
          <Seg label="Strength standards" value={settings.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={set('sex')} />
        </Row>
        <Row label="Weekly goal" hint="Workouts per week">
          <select className="select" style={{ width: 80 }} value={settings.weeklyGoal} onChange={(e) => update({ weeklyGoal: Number(e.target.value) })} aria-label="Weekly goal">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div className="small muted" style={{ fontWeight: 700, margin: '20px 0 6px' }}>
        REST TIMER
      </div>
      <div className="list">
        <Row label="Start automatically" hint="When you complete a set">
          <Switch label="Start rest timer automatically" checked={settings.autoRestTimer} onChange={set('autoRestTimer')} />
        </Row>
        <Row label="Default rest">
          <select className="select" style={{ width: 96 }} value={settings.defaultRestSec} onChange={(e) => update({ defaultRestSec: Number(e.target.value) })} aria-label="Default rest">
            {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {formatDuration(s)}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Sound" hint="Beep when rest is over">
          <Switch label="Rest timer sound" checked={settings.restSound} onChange={set('restSound')} />
        </Row>
      </div>

      <div className="small muted" style={{ fontWeight: 700, margin: '20px 0 6px' }}>
        APPEARANCE
      </div>
      <div className="list">
        <Row label="Theme">
          <Seg label="Theme" value={settings.theme} options={[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} onChange={set('theme')} />
        </Row>
      </div>

      <div className="small muted" style={{ fontWeight: 700, margin: '20px 0 6px' }}>
        YOUR DATA
      </div>
      <p className="small muted" style={{ margin: '0 0 8px' }}>
        Everything is stored on this device only ({workoutCount} workouts, {routineCount} routines). Export a backup regularly, or to move to another phone.
      </p>
      <div className="list">
        <button className="list-item" onClick={exportJson}>
          <Download size={18} /> <span className="grow">Export backup (.json)</span>
        </button>
        <button className="list-item" onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> <span className="grow">Restore from backup</span>
        </button>
        <button className="list-item" onClick={exportCsv}>
          <FileSpreadsheet size={18} /> <span className="grow">Export workouts as CSV</span>
        </button>
        <button className="list-item" style={{ color: 'var(--danger)' }} onClick={reset}>
          <Trash2 size={18} /> <span className="grow">Delete all data</span>
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

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 28 }}>
        Forge · workout tracker
      </p>
    </div>
  );
}
