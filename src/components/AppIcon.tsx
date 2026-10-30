import { useId } from 'react';

/**
 * The app icon (public/icon.svg), drawn inline so its barbell follows the
 * colour picked in Settings.
 */
export function AppIcon({ size = 44 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden style={{ flex: 'none', borderRadius: size * 0.22 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-2-dark, #5e5ce6)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-dark, #0a84ff)' }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#000000" />
      <g fill={`url(#${id})`}>
        <rect x="92" y="184" width="44" height="144" rx="16" />
        <rect x="376" y="184" width="44" height="144" rx="16" />
        <rect x="144" y="140" width="60" height="232" rx="22" />
        <rect x="308" y="140" width="60" height="232" rx="22" />
      </g>
      <rect x="204" y="234" width="104" height="44" rx="12" fill="#ffffff" />
    </svg>
  );
}
