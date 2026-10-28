import { CircleCheck } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** A button in the toast, e.g. Undo. */
interface ToastAction {
  label: string;
  run: () => void;
}

interface AlertButton {
  label: string;
  value: string;
  danger?: boolean;
  /** Bold, like the default action in an iOS alert. */
  bold?: boolean;
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
  resolve: (value: string | null) => void;
}

interface DialogState {
  confirm: AlertState | null;
  toast: { id: number; message: string; action?: ToastAction } | null;
}

const useDialogs = create<DialogState>(() => ({ confirm: null, toast: null }));

/** Promise-based replacement for window.confirm that matches the app's look. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return showAlert({
    title: opts.title,
    message: opts.message,
    buttons: [
      { label: opts.cancelLabel ?? 'Cancel', value: 'cancel' },
      { label: opts.confirmLabel ?? 'OK', value: 'ok', danger: opts.danger, bold: true },
    ],
  }).then((v) => v === 'ok');
}

/**
 * Alert with several choices, stacked like iOS. Resolves with the chosen
 * option's value, or null for Cancel or a tap outside.
 */
export function choose(opts: { title: string; message?: string; options: Omit<AlertButton, 'value'>[]; cancelLabel?: string }): Promise<number | null> {
  return showAlert({
    title: opts.title,
    message: opts.message,
    buttons: [...opts.options.map((o, i) => ({ ...o, value: String(i) })), { label: opts.cancelLabel ?? 'Cancel', value: 'cancel' }],
  }).then((v) => (v === null || v === 'cancel' ? null : Number(v)));
}

function showAlert(opts: Omit<AlertState, 'resolve'>): Promise<string | null> {
  return new Promise((resolve) => {
    useDialogs.getState().confirm?.resolve(null);
    useDialogs.setState({ confirm: { ...opts, resolve } });
  });
}

export function toast(message: string, action?: ToastAction): void {
  useDialogs.setState({ toast: { id: Date.now(), message, action } });
}

export function DialogHost() {
  const { confirm: c, toast: t } = useDialogs();

  useEffect(() => {
    if (!t) return;
    // Leave time to reach an Undo button.
    const timer = setTimeout(() => useDialogs.setState({ toast: null }), t.action ? 4500 : 2600);
    return () => clearTimeout(timer);
  }, [t]);

  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = (value: string | null) => {
    c?.resolve(value);
    useDialogs.setState({ confirm: null });
  };

  return createPortal(
    <>
      {c && (
        <div className="alert-wrap" onPointerDown={(e) => e.target === e.currentTarget && close(null)}>
          <div className="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
            <div className="alert-body">
              <h2 id="alert-title">{c.title}</h2>
              {c.message && <p>{c.message}</p>}
            </div>
            <div className={`alert-actions${c.buttons.length > 2 ? ' stacked' : ''}`}>
              {c.buttons.map((b, i) => (
                <button
                  key={b.value}
                  className={[b.danger && 'danger', b.bold && 'bold'].filter(Boolean).join(' ') || undefined}
                  onClick={() => close(b.value)}
                  autoFocus={i === (c.buttons.length > 2 ? 0 : c.buttons.length - 1)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {t && (
        <div className="toast" role="status" key={t.id}>
          <CircleCheck size={18} />
          {t.message}
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run();
                useDialogs.setState({ toast: null });
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
