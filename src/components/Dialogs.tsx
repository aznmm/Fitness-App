import { useEffect } from 'react';
import { create } from 'zustand';
import { Sheet } from './Sheet';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState {
  confirm: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  toast: { id: number; message: string } | null;
}

const useDialogs = create<DialogState>(() => ({ confirm: null, toast: null }));

/** Promise-based replacement for window.confirm that matches the app's look. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogs.getState().confirm?.resolve(false);
    useDialogs.setState({ confirm: { ...opts, resolve } });
  });
}

export function toast(message: string): void {
  useDialogs.setState({ toast: { id: Date.now(), message } });
}

export function DialogHost() {
  const { confirm: c, toast: t } = useDialogs();

  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => useDialogs.setState({ toast: null }), 2600);
    return () => clearTimeout(timer);
  }, [t]);

  const close = (ok: boolean) => {
    c?.resolve(ok);
    useDialogs.setState({ confirm: null });
  };

  return (
    <>
      {c && (
        <Sheet
          title={c.title}
          onClose={() => close(false)}
          footer={
            <div className="row">
              <button className="btn btn-outline grow" onClick={() => close(false)}>
                {c.cancelLabel ?? 'Cancel'}
              </button>
              <button className={`btn grow ${c.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                {c.confirmLabel ?? 'OK'}
              </button>
            </div>
          }
        >
          {c.message && <p className="secondary" style={{ margin: '4px 0 8px' }}>{c.message}</p>}
        </Sheet>
      )}
      {t && (
        <div className="toast" role="status" key={t.id}>
          {t.message}
        </div>
      )}
    </>
  );
}
