import { useState } from 'react';
import { compact, niceTicks, useWidth } from './useWidth';

export interface Bar {
  key: string | number;
  tick: string;
  value: number;
  /** Tooltip heading, e.g. "Week of Oct 6". */
  title: string;
}

interface Props {
  bars: Bar[];
  height?: number;
  formatValue?: (v: number) => string;
  label: string;
}

const PAD = { top: 22, right: 4, bottom: 22, left: 40 };
const MAX_BAR = 24;
const R = 4;

/** Path for a column with a rounded data end and a square baseline. */
function column(x: number, y: number, w: number, h: number): string {
  const r = Math.min(R, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Single-series column chart; each column is its own hover/focus target. */
export function BarChart({ bars, height = 170, formatValue = compact, label }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  if (!bars.length) return null;

  const max = Math.max(...bars.map((b) => b.value), 0);
  const ticks = niceTicks(0, max || 1, 3);
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / bars.length;
  const barW = Math.min(MAX_BAR, slot - 2);
  const sy = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const labelEvery = Math.ceil(bars.length / 6);
  const last = bars.length - 1;
  const a = active !== null ? bars[active] : null;

  return (
    <div className="chart" ref={ref} role="img" aria-label={`${label}. Latest ${formatValue(bars[last].value)}.`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
            <text className="tick" x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">
              {formatValue(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const h = Math.max(0, sy(0) - sy(b.value));
          return (
            <g
              key={b.key}
              tabIndex={0}
              role="img"
              aria-label={`${b.title}: ${formatValue(b.value)}`}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              style={{ outline: 'none' }}
            >
              <rect x={cx - slot / 2} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <path
                  d={column(cx - barW / 2, sy(b.value), barW, h)}
                  fill="var(--accent)"
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              )}
              {i % labelEvery === (last % labelEvery) && (
                <text className="tick" x={cx} y={height - 6} textAnchor="middle">
                  {b.tick}
                </text>
              )}
              {i === last && b.value > 0 && active === null && (
                <text className="tick" x={cx} y={sy(b.value) - 6} textAnchor="middle" style={{ fill: 'var(--text-2)', fontWeight: 650 }}>
                  {formatValue(b.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {a && (
        <div className="tooltip" style={{ left: Math.min(Math.max(PAD.left + slot * active! + slot / 2, 60), width - 60) }}>
          <strong className="tabular">{formatValue(a.value)}</strong>
          <span className="muted">{a.title}</span>
        </div>
      )}
    </div>
  );
}
