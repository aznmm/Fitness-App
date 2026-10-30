import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DialogHost } from './components/Dialogs';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveWorkoutBar, TabBar } from './components/Layout';
import { RestTimerBar } from './components/RestTimerBar';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Exercises } from './pages/Exercises';
import { Import } from './pages/Import';
import { Home } from './pages/Home';
import { Progress } from './pages/Progress';
import { RoutineEditor } from './pages/RoutineEditor';
import { Routines } from './pages/Routines';
import { Settings } from './pages/Settings';
import { WorkoutDetail } from './pages/WorkoutDetail';
import { useStore } from './store/useStore';

/** Full-screen flows hide the tab bar. */
function hidesTabs(pathname: string, search: string): boolean {
  return pathname === '/workout' || pathname === '/import' || /^\/routines\/[^/]+/.test(pathname) || (pathname.startsWith('/history/') && search.includes('edit=1'));
}

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
  }, [theme]);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const { pathname, search } = useLocation();
  useTheme();
  const tabs = !hidesTabs(pathname, search);
  return (
    <div className="app">
      <ScrollToTop />
      {/* Keyed by page, so moving to another page clears the error. */}
      <ErrorBoundary inApp key={pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<ActiveWorkout />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/:id" element={<RoutineEditor />} />
          <Route path="/history" element={<Navigate to="/progress?view=history" replace />} />
          <Route path="/history/:id" element={<WorkoutDetail />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<Import />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      {tabs && <ActiveWorkoutBar />}
      <RestTimerBar />
      {tabs && <TabBar />}
      <DialogHost />
    </div>
  );
}

// Hash routing works on any static host (GitHub Pages included) without rewrite rules.
export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
