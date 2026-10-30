import { ClipboardPaste, FileUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseBackup } from '../lib/backup';
import { useStore, type AppData } from '../store/useStore';
import { confirm, toast } from './Dialogs';
import { Sheet } from './Sheet';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Restore from a backup file or a copied backup, then add it to this device or replace what's here. */
export function RestoreSheet({ onClose }: { onClose: () => void }) {
  const replaceAll = useStore((s) => s.replaceAll);
  const mergeIn = useStore((s) => s.mergeIn);
  const hasData = useStore((s) => s.workouts.length + s.routines.length + s.bodyweights.length + s.customExercises.length + s.plans.length + s.steps.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [backup, setBackup] = useState<Partial<AppData> | null>(null);

  const load = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      setError('');
      setBackup(null);
      return;
    }
    try {
      setBackup(parseBackup(raw.trim()));
      setError('');
    } catch {
      setBackup(null);
      setError("That doesn't look like a Forge backup. Make sure you copied all of it.");
    }
  };

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) setError('The clipboard is empty. Copy your backup first.');
      else load(clip);
    } catch {
      setError('Could not read the clipboard. Long-press the box below and choose Paste.');
    }
  };

  const add = () => {
    if (!backup) return;
    // With nothing here yet, take the backup whole, settings included.
    if (hasData) mergeIn(backup);
    else replaceAll(backup);
    toast(hasData ? 'Backup added' : 'Backup restored');
    onClose();
  };

  const replace = async () => {
    if (!backup) return;
    const ok = await confirm({
      title: 'Replace everything?',
      message: 'Workouts, routines and bodyweight entries on this device that are not in the backup will be erased. A workout in progress is kept.',
      confirmLabel: 'Replace',
      danger: true,
    });
    if (!ok) return;
    replaceAll(backup);
    toast('Backup restored');
    onClose();
  };

  return (
    <Sheet title="Restore backup" onClose={onClose}>
      {backup ? (
        <div className="stack">
          <div className="card tight">
            <div className="card-title">Backup found</div>
            <p className="muted" style={{ margin: 0 }}>
              {plural(backup.workouts?.length ?? 0, 'workout')}, {plural(backup.routines?.length ?? 0, 'routine')}, {plural(backup.bodyweights?.length ?? 0, 'bodyweight entry', 'bodyweight entries')}.
            </p>
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={add}>
            {hasData ? 'Add to this device' : 'Restore'}
          </button>
          {hasData && (
            <button className="btn btn-plain-danger btn-block" onClick={replace}>
              Replace everything on this device
            </button>
          )}
          <p className="small faint" style={{ margin: 0 }}>
            {hasData ? 'Adding keeps what is already here and fills in anything missing. Where both have the same workout, the newer edit wins.' : 'Nothing is stored here yet, so this simply brings the backup in.'}
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => load('')}>
            Use a different backup
          </button>
        </div>
      ) : (
        <div className="stack">
          <button className="btn btn-tinted btn-block btn-lg" onClick={() => fileRef.current?.click()}>
            <FileUp size={18} /> Choose backup file
          </button>
          <button className="btn btn-tinted btn-block btn-lg" onClick={paste}>
            <ClipboardPaste size={18} /> Paste copied backup
          </button>
          <textarea
            className="textarea"
            style={{ minHeight: 90, maxHeight: 180, fontSize: 13 }}
            placeholder="…or paste the backup text here"
            value={text}
            onChange={(e) => load(e.target.value)}
            aria-label="Backup text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {error && (
            <p className="small" style={{ color: 'var(--red)', margin: 0 }} role="alert">
              {error}
            </p>
          )}
          <p className="small faint" style={{ margin: 0 }}>
            On iPhone, Safari and the home-screen app keep separate data. To move it, tap Copy backup in Settings where your workouts are, then come here in the other one and paste.
          </p>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) load(await f.text());
        }}
      />
    </Sheet>
  );
}
