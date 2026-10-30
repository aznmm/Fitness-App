import { BarChart3, ChevronLeft, ClipboardList, Dumbbell, Home, Play } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { create } from 'zustand';
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
    <>
      {/* Content fades out under the floating bar instead of showing below it. */}
      <div className="tabbar-fade" aria-hidden />
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
    </>
  );
}

/** True while Home's own Resume button is on screen; the floating bars would only cover it. */
export const useResumeOnScreen = create<boolean>(() => false);

/** Ref for Home's Resume button: hides the floating workout and rest bars while it's visible. */
export function resumeButtonRef(el: HTMLElement | null) {
  if (!el) return;
  const io = new IntersectionObserver(([entry]) => useResumeOnScreen.setState(entry.isIntersecting, true));
  io.observe(el);
  return () => {
    io.disconnect();
    useResumeOnScreen.setState(false, true);
  };
}

/** Floating pill above the tab bar while a workout is running. */
export function ActiveWorkoutBar() {
  const active = useStore((s) => s.active);
  const rest = useStore((s) => s.rest);
  const resumeShown = useResumeOnScreen();
  const now = useNow(1000);
  const { pathname } = useLocation();
  if (!active || pathname === '/workout' || rest || resumeShown) return null;
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

/** Each history entry's screen title, so a back button can name where it goes. */
const titles = new Map<number, string>();

/** React Router keeps the position in the session history in `history.state.idx`. */
function historyIndex(): number | undefined {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : undefined;
}

/** Names this screen for the back button of the next one ("‹ Routines"). */
export function useBackTitle(title: string) {
  const { key } = useLocation();
  useEffect(() => {
    const idx = historyIndex();
    if (idx !== undefined) titles.set(idx, title);
  }, [title, key]);
}

/** Screen names for back buttons with a fixed target or no history (opened from a link). */
function screenName(path: string): string {
  if (path === '/') return 'Home';
  return TABS.find((t) => t.match.some((m) => path.startsWith(m)))?.label ?? (path.startsWith('/settings') ? 'Settings' : 'Back');
}

/** iOS-style back: a chevron and the name of the screen it returns to. */
export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  const idx = historyIndex();
  const canGoBack = idx !== undefined ? idx > 0 : window.history.length > 1;
  const name = to ? screenName(to) : canGoBack ? (titles.get((idx ?? 0) - 1) ?? 'Back') : 'Home';
  // Long titles would crowd the bar; iOS falls back to "Back" too.
  const label = name.length > 12 ? 'Back' : name;
  return (
    <button className="back-btn" aria-label={label === 'Back' ? 'Back' : `Back to ${label}`} onClick={() => (to ? navigate(to) : canGoBack ? navigate(-1) : navigate('/'))}>
      <ChevronLeft size={28} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}

interface PageHeaderProps {
  title: string;
  /** What the next screen's back button calls this one; defaults to the title. */
  backTitle?: string;
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
export function PageHeader({ title, backTitle, eyebrow, back, actions, compact, navTitle }: PageHeaderProps) {
  const scrolled = useScrolled();
  useBackTitle(backTitle ?? title);
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
