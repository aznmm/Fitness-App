import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { compact, niceTicks, useWidth } from './useWidth';

export interface LinePoint {
  x: number;
  y: number;
}

interface Props {
  points: LinePoint[];
  height?: number;
  formatY?: (v: number) => string;
  formatX: (x: number) => string;
  /** Long label for tooltips; defaults to formatX. */
  formatXLong?: (x: number) => string;
  label: string;
  zeroBased?: boolean;
}

const PAD = { top: 16, right: 16, bottom: 24, left: 40 };

/** Single-series line with area wash, end label, and a snapping crosshair. */
export function LineChart({ points, height = 180, formatY = compact, formatX, formatXLong = formatX, label, zeroBased }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const washId = `wash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const ticks = niceTicks(zeroBased ? 0 : Math.min(...ys), Math.max(...ys));
  const minY = ticks[0];
  const maxY = ticks[ticks.length - 1];
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (maxX === minX ? innerW / 2 : ((x - minX) / (maxX - minX)) * innerW);
  const sy = (y: number) => PAD.top + innerH - ((y - minY) / (maxY - minY || 1)) * innerH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const area = `${line}L${sx(points[points.length - 1].x).toFixed(1)},${sy(minY)}L${sx(points[0].x).toFixed(1)},${sy(minY)}Z`;
  const last = points[points.length - 1];
  const xTicks = points.length > 2 ? [points[0], points[Math.floor((points.length - 1) / 2)], last] : points;

  const nearest = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(sx(points[i].x) - x) < Math.abs(sx(points[best].x) - x)) best = i;
    return best;
  };

  const onPointer = (e: PointerEvent<SVGSVGElement>) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length) - 1));
    else if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  const a = active !== null ? points[active] : null;

  return (
    <div className="chart" ref={ref} tabIndex={0} role="img" aria-label={`${label}. Latest ${formatY(last.y)} on ${formatXLong(last.x)}.`} onKeyDown={onKey} onBlur={() => setActive(null)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth={1} />
            <text className="tick" x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((p, i) => (
          <text
            key={p.x}
            className="tick"
            x={sx(p.x)}
            y={height - 6}
            textAnchor={xTicks.length > 1 && i === 0 ? 'start' : i === xTicks.length - 1 && xTicks.length > 1 ? 'end' : 'middle'}
          >
            {formatX(p.x)}
          </text>
        ))}
        <defs>
          <linearGradient id={washId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${washId})`} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.length === 1 && <circle cx={sx(last.x)} cy={sy(last.y)} r={4} fill="var(--accent)" />}
        {a && <line x1={sx(a.x)} x2={sx(a.x)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--axis)" strokeWidth={1} />}
        <circle
          cx={sx((a ?? last).x)}
          cy={sy((a ?? last).y)}
          r={5}
          fill="var(--accent)"
          stroke="var(--card)"
          strokeWidth={2.5}
        />
      </svg>
      {a ? (
        <div className="tooltip" style={{ left: Math.min(Math.max(sx(a.x), 50), width - 50) }}>
          <strong className="tabular">{formatY(a.y)}</strong>
          <span className="muted">{formatXLong(a.x)}</span>
        </div>
      ) : null}
    </div>
  );
}
