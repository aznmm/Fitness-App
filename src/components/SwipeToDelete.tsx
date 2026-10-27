import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Width of the revealed Delete button. */
const REVEAL = 84;
/** Past this share of the row's width, letting go deletes straight away. */
const FULL_SWIPE = 0.55;

/**
 * iOS-style swipe to delete: drag the row left to reveal a Delete button, or
 * swipe all the way to delete at once. Vertical scrolling still works.
 */
export function SwipeToDelete({ onDelete, label, children }: { onDelete: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const current = useRef(0);
  const drag = useRef<{ x: number; y: number; from: number; axis?: 'x' | 'y' } | null>(null);

  const move = (x: number) => {
    current.current = x;
    setOffset(x);
  };

  // Close again when the user touches anywhere else.
  useEffect(() => {
    if (!offset) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) move(0);
    };
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
    };
  }, [offset]);

  const remove = () => {
    move(-(ref.current?.offsetWidth ?? 320));
    setTimeout(onDelete, 180);
  };

  return (
    <div className={`swipe${offset || dragging ? ' open' : ''}`} ref={ref}>
      <button className="swipe-action" onClick={remove} aria-label={label} tabIndex={offset ? 0 : -1} style={{ width: Math.max(REVEAL, -offset) }}>
        <Trash2 size={17} /> Delete
      </button>
      <div
        className="swipe-content"
        style={{ transform: offset ? `translateX(${offset}px)` : undefined, transition: dragging ? 'none' : undefined }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          drag.current = { x: t.clientX, y: t.clientY, from: current.current };
        }}
        onTouchMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const t = e.touches[0];
          const dx = t.clientX - d.x;
          const dy = t.clientY - d.y;
          if (!d.axis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (d.axis === 'x') {
              setDragging(true);
              (document.activeElement as HTMLElement | null)?.blur();
            }
          }
          if (d.axis === 'x') move(Math.min(0, Math.max(-(ref.current?.offsetWidth ?? 320), d.from + dx)));
        }}
        onTouchEnd={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.axis !== 'x') return;
          setDragging(false);
          const width = ref.current?.offsetWidth ?? 320;
          if (current.current < -width * FULL_SWIPE) remove();
          else move(current.current < -REVEAL / 2 ? -REVEAL : 0);
        }}
        onClickCapture={(e) => {
          // While open, a tap on the row just closes it.
          if (current.current) {
            e.preventDefault();
            e.stopPropagation();
            move(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
