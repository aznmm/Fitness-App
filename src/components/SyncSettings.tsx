import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { signIn, signOut, signUp, syncNow, useSync } from '../sync/engine';
import { useNow } from '../lib/useNow';
import { confirm, toast } from './Dialogs';
import { Sheet } from './Sheet';

function ago(t: number | undefined, now: number): string {
  if (!t) return 'not yet';
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** "Account & sync" block for the Settings page. */
export function SyncSettings({ IconTile }: { IconTile: (p: { color: string; children: ReactNode }) => ReactNode }) {
  const { status, email, lastSyncedAt, error } = useSync();
  const now = useNow(30_000);
  const [sheet, setSheet] = useState(false);

  if (status === 'unconfigured') {
    return (
      <>
        <div className="list with-small-icons">
          <div className="list-item">
            <IconTile color="#8e8e93">
              <CloudOff size={17} />
            </IconTile>
            <div className="grow">
              <div className="title">Cloud sync</div>
              <div className="sub">Not set up yet</div>
            </div>
          </div>
        </div>
        <div className="list-footer">Once sync is set up you'll be able to sign in here and keep your data backed up across devices.</div>
      </>
    );
  }

  if (status === 'loading' || status === 'signed-out') {
    return (
      <>
        <div className="list with-small-icons">
          <button className="list-item" onClick={() => setSheet(true)} disabled={status === 'loading'}>
            <IconTile color="var(--accent)">
              <Cloud size={17} />
            </IconTile>
            <div className="grow">
              <div className="title">{status === 'loading' ? 'Connecting…' : 'Sign in to sync'}</div>
              <div className="sub">Back up and sync your workouts across devices</div>
            </div>
          </button>
        </div>
        {sheet && <SignInSheet onClose={() => setSheet(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="list with-small-icons">
        <div className="list-item">
          <IconTile color="var(--green)">
            <Cloud size={17} />
          </IconTile>
          <div className="grow">
            <div className="title truncate">{email}</div>
            <div className="sub" style={error ? { color: 'var(--red)' } : undefined}>
              {status === 'syncing' ? 'Syncing…' : error ? error : `Synced ${ago(lastSyncedAt, now)}`}
            </div>
          </div>
          <button className="btn btn-sm btn-tinted" onClick={() => void syncNow()} disabled={status === 'syncing'} aria-label="Sync now">
            <RefreshCw size={15} className={status === 'syncing' ? 'spin' : undefined} /> Sync
          </button>
        </div>
        <button
          className="list-item"
          onClick={async () => {
            const ok = await confirm({ title: 'Sign out?', message: 'Your data stays on this device. Sign back in any time to sync again.', confirmLabel: 'Sign out' });
            if (ok) {
              await signOut();
              toast('Signed out');
            }
          }}
        >
          <IconTile color="#8e8e93">
            <LogOut size={17} />
          </IconTile>
          <span className="grow title">Sign out</span>
        </button>
      </div>
      <div className="list-footer">Changes sync automatically a few seconds after you make them. The workout you're doing right now stays on this device until you finish it.</div>
    </>
  );
}

function SignInSheet({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'up' && password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        await signIn(email, password);
        toast('Signed in, syncing…');
        onClose();
      } else {
        const r = await signUp(email, password);
        if (r === 'confirm-email') setSent(true);
        else {
          toast('Account created, syncing…');
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={mode === 'in' ? 'Sign in' : 'Create account'} onClose={onClose}>
      {sent ? (
        <div className="empty" style={{ paddingTop: 12 }}>
          <div className="empty-icon">
            <Cloud size={30} />
          </div>
          <h3>Check your email</h3>
          <p className="small">
            We sent a confirmation link to <strong>{email}</strong>. Tap it, then come back here and sign in with your password.
          </p>
          <button
            className="btn btn-tinted"
            style={{ marginTop: 14 }}
            onClick={() => {
              setSent(false);
              setMode('in');
            }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="seg" role="group" aria-label="Account">
            <button type="button" aria-pressed={mode === 'in'} onClick={() => setMode('in')}>
              Sign in
            </button>
            <button type="button" aria-pressed={mode === 'up'} onClick={() => setMode('up')}>
              Create account
            </button>
          </div>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="small" style={{ color: 'var(--red)', margin: 0 }}>
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !email || !password}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
          <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
            Data already on this device is merged with your account. Nothing is overwritten.
          </p>
        </form>
      )}
    </Sheet>
  );
}
