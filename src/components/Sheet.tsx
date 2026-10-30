import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  /** Shown at the leading edge of the header, e.g. a "New" button. */
  headerExtra?: ReactNode;
}

let openSheets = 0;

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Sheet({ title, onClose, children, footer, full, headerExtra }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    openSheets++;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      openSheets--;
      if (openSheets === 0) document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="grabber" aria-hidden />
        <div className="sheet-head">
          <div>{headerExtra}</div>
          <h2 id={titleId}>{title}</h2>
          <div className="end">
            <button className="glass-btn" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
