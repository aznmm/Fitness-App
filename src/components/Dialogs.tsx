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

interface DialogState {
  confirm: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  toast: { id: number; message: string; action?: ToastAction } | null;
}

const useDialogs = create<DialogState>(() => ({ confirm: null, toast: null }));

/** Promise-based replacement for window.confirm that matches the app's look. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogs.getState().confirm?.resolve(false);
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = (ok: boolean) => {
    c?.resolve(ok);
    useDialogs.setState({ confirm: null });
  };

  return createPortal(
    <>
      {c && (
        <div className="alert-wrap" onPointerDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
            <div className="alert-body">
              <h2 id="alert-title">{c.title}</h2>
              {c.message && <p>{c.message}</p>}
            </div>
            <div className="alert-actions">
              <button onClick={() => close(false)}>{c.cancelLabel ?? 'Cancel'}</button>
              <button className={c.danger ? 'danger' : undefined} onClick={() => close(true)} autoFocus>
                {c.confirmLabel ?? 'OK'}
              </button>
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
