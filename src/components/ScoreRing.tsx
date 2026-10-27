import { useEffect, useId, useState, type ReactNode } from 'react';

interface Props {
  /** 0–1 fill of the ring. */
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label: string;
  /** Gradient start and end colours. */
  colors?: [string, string];
}

/** Activity-ring style gauge with a gradient arc that animates in. */
export function ScoreRing({ progress, size = 128, stroke = 14, children, label, colors = ['var(--accent-2)', 'var(--accent)'] }: Props) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, progress))));
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors[1]} strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          className="arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
