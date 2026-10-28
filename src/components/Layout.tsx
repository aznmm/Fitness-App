import { BarChart3, ChevronLeft, ClipboardList, Dumbbell, Home, Play } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNow } from '../lib/useNow';
import { formatDuration } from '../lib/units';
import { useStore } from '../store/useStore';

/** `match` lists the path prefixes that light the tab up. */
const TABS = [
  { to: '/', label: 'Home', icon: Home, match: [] as string[] },
  { to: '/routines', label: 'Routines', icon: ClipboardList, match: ['/routines'] },
  { to: '/progress', label: 'Progress', icon: BarChart3, match: ['/progress', '/history'] },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell, match: ['/exercises'] },
];

export function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const active = to === '/' ? pathname === '/' : match.some((m) => pathname.startsWith(m));
        return (
          <Link key={to} to={to} className={`tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon size={22} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Floating pill above the tab bar while a workout is running. */
export function ActiveWorkoutBar() {
  const active = useStore((s) => s.active);
  const rest = useStore((s) => s.rest);
  const now = useNow(1000);
  const { pathname } = useLocation();
  if (!active || pathname === '/workout' || rest) return null;
  return (
    <Link to="/workout" className="floating active-bar" aria-label={`Resume ${active.name}`}>
      <span className="pulse" aria-hidden />
      <div className="grow">
        <div style={{ fontWeight: 600 }} className="truncate">
          {active.name}
        </div>
        <div className="small muted rounded-num">{formatDuration((now - active.startedAt) / 1000)}</div>
      </div>
      <span className="go" aria-hidden>
        <Play size={18} fill="currentColor" />
      </span>
    </Link>
  );
}

/** True once the page has scrolled past `threshold` px. */
export function useScrolled(threshold = 36): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      className="glass-btn"
      aria-label="Back"
      onClick={() => (to ? navigate(to) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
    >
      <ChevronLeft size={22} strokeWidth={2.4} />
    </button>
  );
}

interface PageHeaderProps {
  title: string;
  eyebrow?: ReactNode;
  back?: boolean | string;
  actions?: ReactNode;
  /** Smaller large title for detail screens with long names. */
  compact?: boolean;
  /** What the glass bar shows once the large title scrolls away; defaults to the title. */
  navTitle?: ReactNode;
}

/**
 * iOS-style large title. A glass navigation bar holds the back button and
 * actions; the title shrinks into it once the page scrolls.
 */
export function PageHeader({ title, eyebrow, back, actions, compact, navTitle }: PageHeaderProps) {
  const scrolled = useScrolled();
  return (
    <>
      <div className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="navbar-side">{back && <BackButton to={typeof back === 'string' ? back : undefined} />}</div>
        <div className="navbar-title truncate" aria-hidden>
          {navTitle ?? title}
        </div>
        <div className="navbar-side end">{actions}</div>
      </div>
      <header className={`large-title${compact ? ' compact' : ''}`}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </header>
    </>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
