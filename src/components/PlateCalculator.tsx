import { useState } from 'react';
import { BAR_OPTIONS, defaultBarKg, platesPerSide } from '../lib/progression';
import { fromKg, toKg, trimNumber } from '../lib/units';
import { useStore } from '../store/useStore';
import { Sheet } from './Sheet';

/** Competition-style plate colours, keyed by plate size in each unit. */
const PLATE_STYLE: Record<string, { color: string; h: number }> = {
  'kg-25': { color: '#e5383b', h: 132 },
  'kg-20': { color: '#2f6fde', h: 132 },
  'kg-15': { color: '#f2c12e', h: 116 },
  'kg-10': { color: '#2fa84f', h: 100 },
  'kg-5': { color: '#e8e8ea', h: 80 },
  'kg-2.5': { color: '#3a3a3c', h: 66 },
  'kg-1.25': { color: '#a1a1a6', h: 56 },
  'lb-45': { color: '#2f6fde', h: 132 },
  'lb-35': { color: '#f2c12e', h: 116 },
  'lb-25': { color: '#2fa84f', h: 100 },
  'lb-10': { color: '#e8e8ea', h: 80 },
  'lb-5': { color: '#e5383b', h: 66 },
  'lb-2.5': { color: '#a1a1a6', h: 56 },
};

interface Props {
  initialKg?: number;
  onClose: () => void;
}

export function PlateCalculator({ initialKg, onClose }: Props) {
  const unit = useStore((s) => s.settings.unit);
  const barKg = useStore((s) => s.settings.barKg) ?? defaultBarKg(unit);
  const updateSettings = useStore((s) => s.updateSettings);
  const bar = Math.round(fromKg(barKg, unit) * 100) / 100;
  const [text, setText] = useState(() => (initialKg ? trimNumber(fromKg(initialKg, unit)) : ''));

  const total = Number(text.replace(',', '.'));
  const load = total > 0 ? platesPerSide(total, bar, unit) : null;
  const options = [...new Set([...BAR_OPTIONS[unit], Math.round(bar)])].sort((a, b) => b - a);

  return (
    <Sheet title="Plate calculator" onClose={onClose}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field grow">
          <span>Total weight ({unit})</span>
          <input
            className="input rounded-num"
            style={{ fontSize: 24, fontWeight: 700, minHeight: 56 }}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={String(bar)}
            autoFocus
          />
        </label>
        <label className="field" style={{ width: 120 }}>
          <span>Bar</span>
          <select
            className="select rounded-num"
            style={{ minHeight: 56, fontWeight: 600 }}
            value={Math.round(bar)}
            onChange={(e) => updateSettings({ barKg: toKg(Number(e.target.value), unit) })}
          >
            {options.map((b) => (
              <option key={b} value={b}>
                {b} {unit}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ marginTop: 16, padding: '20px 12px' }}>
        <BarVisual plates={load?.plates ?? []} unit={unit} />
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {!load ? (
            <span className="muted">Enter a weight to see the plates.</span>
          ) : load.plates.length === 0 ? (
            <span className="muted">Just the empty bar.</span>
          ) : (
            <>
              <div className="small muted">Each side</div>
              <div className="rounded-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                {load.plates.map((p) => trimNumber(p, 2)).join(' + ')}
              </div>
            </>
          )}
          {load && !load.exact && (
            <div className="small" style={{ color: 'var(--gold)', marginTop: 8 }}>
              Can't make {trimNumber(total, 2)} {unit} exactly. Closest is {trimNumber(load.loaded, 2)} {unit}.
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function BarVisual({ plates, unit }: { plates: number[]; unit: string }) {
  const W = 320;
  const H = 150;
  const mid = H / 2;
  const plateW = 13;
  const gap = 2;
  const sleeveStart = 120;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: 360, margin: '0 auto' }} role="img" aria-label={`Plates per side: ${plates.join(', ') || 'none'}`}>
      {/* bar shaft and collar */}
      <rect x={0} y={mid - 4} width={sleeveStart} height={8} rx={2} fill="var(--fill-strong)" />
      <rect x={sleeveStart - 10} y={mid - 14} width={10} height={28} rx={3} fill="var(--text-3)" />
      <rect x={sleeveStart} y={mid - 7} width={W - sleeveStart} height={14} rx={3} fill="var(--fill-strong)" />
      {plates.map((p, i) => {
        const style = PLATE_STYLE[`${unit}-${p}`] ?? { color: 'var(--accent)', h: 80 };
        const x = sleeveStart + 4 + i * (plateW + gap);
        return (
          <g key={i}>
            <rect x={x} y={mid - style.h / 2} width={plateW} height={style.h} rx={4} fill={style.color} />
            <rect x={x} y={mid - style.h / 2} width={plateW} height={style.h} rx={4} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}
