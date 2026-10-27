import { ChevronRight, ClipboardPaste, Footprints, HeartPulse, Minus, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, formatTime, relativeDay, sameDay, toDateInput } from '../lib/dates';
import { isIOS, parseCount, parseStepsText, recentSteps, STEPS_SHORTCUT, stepsShortcutUrl } from '../lib/steps';
import { useStore } from '../store/useStore';
import { toast } from './Dialogs';
import { ScoreRing } from './ScoreRing';
import { Sheet } from './Sheet';

export const STEP_RING: [string, string] = ['var(--m-cardio)', 'var(--green)'];
const GOAL_STEP = 500;

export const formatSteps = (n: number) => Math.round(n).toLocaleString();

/** Home card: today's steps against the goal, with the last 7 days. */
export function StepsCard() {
  const entries = useStore((s) => s.steps);
  const goal = useStore((s) => s.settings.stepGoal);
  const [open, setOpen] = useState(false);
  const week = useMemo(() => recentSteps(entries, 7), [entries]);
  const today = week[week.length - 1];
  const entry = entries.find((e) => e.date === toDateInput(Date.now()));
  const pct = Math.round((today.count / goal) * 100);

  return (
    <>
      <button className="card link" onClick={() => setOpen(true)} aria-label={`Steps: ${formatSteps(today.count)} of ${formatSteps(goal)}. Update steps`}>
        <div className="spread">
          <div className="card-title">Steps</div>
          <ChevronRight size={20} className="faint" />
        </div>
        <div className="row" style={{ gap: 18, marginTop: 10, alignItems: 'center' }}>
          <ScoreRing progress={today.count / goal} size={92} stroke={11} colors={STEP_RING} label={`${pct}% of step goal`}>
            <Footprints size={24} color="var(--green)" aria-hidden />
          </ScoreRing>
          <div className="grow">
            <div className="step-count">
              {today.logged ? formatSteps(today.count) : '–'}
              <small> / {formatSteps(goal)}</small>
            </div>
            <div className="small muted" style={{ marginTop: 2 }}>
              {!entry
                ? isIOS()
                  ? 'Tap to update from Apple Health'
                  : 'Tap to log today’s steps'
                : today.count >= goal
                  ? 'Goal reached'
                  : `${pct}% of goal · updated ${formatTime(entry.updatedAt ?? Date.now())}`}
            </div>
            <MiniBars days={week} goal={goal} />
          </div>
        </div>
      </button>
      {open && <StepsSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function MiniBars({ days, goal }: { days: { date: number; count: number }[]; goal: number }) {
  return (
    <div className="mini-bars" aria-hidden>
      {days.map((d) => (
        <div key={d.date}>
          <i className={d.count >= goal ? 'hit' : ''} style={{ height: Math.max(4, Math.min(1, d.count / goal) * 30) }} />
          <span className={sameDay(d.date, Date.now()) ? 'today' : ''}>{formatDate(d.date, { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  );
}

/** Update steps from Apple Health (via the Shortcut) or by hand, and set the goal. */
export function StepsSheet({ onClose }: { onClose: () => void }) {
  const entries = useStore((s) => s.steps);
  const goal = useStore((s) => s.settings.stepGoal);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveSteps = useStore((s) => s.saveSteps);
  const deleteSteps = useStore((s) => s.deleteSteps);
  const ios = isIOS();
  const [ran, setRan] = useState(false);
  const [pasteBox, setPasteBox] = useState(false);
  const [guide, setGuide] = useState(() => ios && !entries.some((e) => e.source === 'health'));
  const [manual, setManual] = useState('');
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const week = useMemo(() => recentSteps(entries, 7).reverse(), [entries]);

  const importText = (text: string) => {
    const found = parseStepsText(text);
    if (!found.length) {
      toast(`No steps on the clipboard. Run “${STEPS_SHORTCUT}” first.`);
      return false;
    }
    saveSteps(found, 'health');
    const today = found.find((f) => f.date === toDateInput(Date.now()));
    toast(today ? `Today: ${formatSteps(today.count)} steps` : `Updated ${found.length} day${found.length === 1 ? '' : 's'} of steps`);
    setPasteBox(false);
    setRan(false);
    return true;
  };

  const paste = async () => {
    try {
      importText(await navigator.clipboard.readText());
    } catch {
      // Clipboard access refused or unsupported: let them paste by hand.
      setPasteBox(true);
    }
  };

  const saveManual = () => {
    const n = parseCount(manual.trim());
    if (n === null || !manual.trim()) return;
    saveSteps([{ date, count: n }], 'manual');
    setManual('');
    toast(`${formatSteps(n)} steps saved`);
  };

  const setGoal = (g: number) => updateSettings({ stepGoal: Math.min(50_000, Math.max(1_000, g)) });

  return (
    <Sheet title="Steps" onClose={onClose}>
      {ios ? (
        <div className="stack" style={{ gap: 10 }}>
          <button
            className={`btn btn-lg btn-block ${ran ? 'btn-tinted' : 'btn-primary'}`}
            onClick={() => {
              setRan(true);
              window.location.href = stepsShortcutUrl();
            }}
          >
            <HeartPulse size={19} /> Get steps from Apple Health
          </button>
          <button className={`btn btn-lg btn-block ${ran ? 'btn-primary' : 'btn-tinted'}`} onClick={paste}>
            <ClipboardPaste size={19} /> Paste steps
          </button>
          <p className="tiny muted" style={{ margin: '2px 4px 0' }}>
            {ran
              ? 'Back from Shortcuts? Tap Paste steps, then Paste.'
              : `Runs your “${STEPS_SHORTCUT}” Shortcut, which copies the last 7 days. Come back here and tap Paste steps.`}{' '}
            <button className="link-btn" onClick={() => setGuide(!guide)}>
              {guide ? 'Hide setup' : 'Set up the Shortcut'}
            </button>
          </p>
        </div>
      ) : (
        <p className="small muted" style={{ marginTop: 0 }}>
          Apple Health steps come in on iPhone through a Shortcut. Here you can type them in.{' '}
          <button className="link-btn" onClick={() => setGuide(!guide)}>
            {guide ? 'Hide setup' : 'How it works'}
          </button>
        </p>
      )}

      {pasteBox && (
        <textarea
          className="textarea"
          style={{ marginTop: 12 }}
          rows={3}
          autoFocus
          placeholder="Long-press here and tap Paste"
          aria-label="Paste steps here"
          onChange={(e) => e.target.value.trim() && importText(e.target.value)}
        />
      )}

      {guide && <ShortcutGuide />}

      <div className="list-header" style={{ marginTop: 24 }}>
        Daily goal
      </div>
      <div className="card tight spread">
        <button className="icon-btn filled" aria-label="Lower goal" onClick={() => setGoal(goal - GOAL_STEP)} disabled={goal <= 1_000}>
          <Minus size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="step-count">{formatSteps(goal)}</div>
          <div className="tiny muted">steps a day</div>
        </div>
        <button className="icon-btn filled" aria-label="Raise goal" onClick={() => setGoal(goal + GOAL_STEP)} disabled={goal >= 50_000}>
          <Plus size={18} />
        </button>
      </div>

      <div className="list-header" style={{ marginTop: 24 }}>
        Enter by hand
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          saveManual();
        }}
      >
        <input className="input" inputMode="numeric" placeholder="Steps" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Step count" style={{ flex: 1.1 }} />
        <input className="input" type="date" value={date} max={toDateInput(Date.now())} onChange={(e) => setDate(e.target.value)} aria-label="Date" style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={!manual.trim()} style={{ minHeight: 46 }}>
          Save
        </button>
      </form>

      <div className="list-header" style={{ marginTop: 24 }}>
        Last 7 days
      </div>
      <div className="list">
        {week.map((d) => (
          <div className="list-item" key={d.date} style={{ minHeight: 48 }}>
            <span className="grow">{relativeDay(d.date)}</span>
            <span className="rounded-num" style={{ fontWeight: 600, color: d.logged && d.count >= goal ? 'var(--green-text)' : d.logged ? 'var(--text)' : 'var(--text-3)' }}>
              {d.logged ? formatSteps(d.count) : '–'}
            </span>
            {d.logged && (
              <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label={`Delete steps for ${relativeDay(d.date)}`} onClick={() => deleteSteps(toDateInput(d.date))}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/** Step-by-step instructions for building the Shortcut on an iPhone. */
export function ShortcutGuide() {
  return (
    <div className="card tight" style={{ marginTop: 14 }}>
      <h3 style={{ margin: '2px 0 10px', fontSize: 17 }}>Set up the Shortcut (once)</h3>
      <ol className="steps">
        <li>
          <span>
            Open the <strong>Shortcuts</strong> app and tap <strong>+</strong>. Name the shortcut <strong>{STEPS_SHORTCUT}</strong>, spelled exactly like that.
          </span>
        </li>
        <li>
          <span>
            Add <strong>Find Health Samples</strong>. Set the type to <strong>Steps</strong>, add the filter <strong>Start Date is in the last 7 days</strong>, and
            set <strong>Group By</strong> to <strong>Day</strong>.
          </span>
        </li>
        <li>
          <span>
            Add <strong>Repeat with Each</strong>. Inside it, add a <strong>Text</strong> action. In the text, insert <strong>Repeat Item</strong>, tap it and
            pick <strong>Start Date</strong> with the <strong>ISO 8601</strong> format. Type a space, then insert <strong>Repeat Item</strong> again and pick{' '}
            <strong>Value</strong>.
          </span>
        </li>
        <li>
          <span>
            After <strong>End Repeat</strong>, add <strong>Copy to Clipboard</strong>.
          </span>
        </li>
        <li>
          <span>Tap ▶ to run it once and allow access to Health.</span>
        </li>
      </ol>
      <p className="tiny muted" style={{ margin: '10px 0 0' }}>
        Grouping by day matches the totals in the Health app, without counting iPhone and Apple Watch steps twice. After it runs, tap the <strong>◀</strong> back link in the top-left corner
        to return to Forge.
      </p>
    </div>
  );
}
