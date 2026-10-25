import { BarChart3, ChevronLeft, ClipboardList, Dumbbell, History, Home, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useNow } from '../lib/useNow';
import { formatElapsed } from '../lib/units';
import { useStore } from '../store/useStore';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/routines', label: 'Routines', icon: ClipboardList },
  { to: '/history', label: 'History', icon: History },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Pill above the tab bar while a workout is running. */
export function ActiveWorkoutBar() {
  const active = useStore((s) => s.active);
  const rest = useStore((s) => s.rest);
  const now = useNow(1000);
  const { pathname } = useLocation();
  if (!active || pathname === '/workout' || rest) return null;
  return (
    <Link to="/workout" className="floating active-bar">
      <span className="pulse" aria-hidden />
      <div className="grow">
        <div style={{ fontWeight: 700 }} className="truncate">
          {active.name}
        </div>
        <div className="small tabular" style={{ opacity: 0.85 }}>
          {formatElapsed(now - active.startedAt)} · tap to resume
        </div>
      </div>
      <Play size={20} fill="currentColor" />
    </Link>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  back?: boolean | string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, back, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button
          className="icon-btn filled"
          aria-label="Back"
          onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="title">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {typeof title === 'string' ? <h1 className={back ? 'truncate' : undefined} style={back ? { fontSize: 22 } : undefined}>{title}</h1> : title}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {children}
    </div>
  );
}
