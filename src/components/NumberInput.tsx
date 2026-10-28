import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined;
  onValue: (v: number | undefined) => void;
  format: (v: number) => string;
  parse: (s: string) => number | undefined;
  /** Accept negative parsed values (assistance on assisted machines is stored as negative weight). */
  allowNegative?: boolean;
}

/**
 * Keeps the typed text locally (so "62." or "1:" survive while typing) and
 * reports parsed values upward. Re-syncs from props when not focused.
 */
export function NumberInput({ value, onValue, format, parse, allowNegative, onBlur, onFocus, ...rest }: Props) {
  const [text, setText] = useState(() => (value === undefined ? '' : format(value)));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value === undefined ? '' : format(value));
  }, [value, format]);

  return (
    <input
      {...rest}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(value === undefined ? '' : format(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const v = parse(t);
        if (t.trim() === '') onValue(undefined);
        else if (v !== undefined && Number.isFinite(v) && (allowNegative || v >= 0)) onValue(v);
      }}
    />
  );
}
