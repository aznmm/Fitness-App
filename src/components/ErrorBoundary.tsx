import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Inside the app shell the tab bar stays usable, so the fallback only covers the page. */
  inApp?: boolean;
}

/**
 * Shows a way out instead of a blank screen when a page throws, e.g. on
 * damaged data. A home-screen app has no address bar, so the fallback links
 * to Settings, where a backup can be restored or the data reset.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const go = (hash: string) => {
      window.location.hash = hash;
      if (this.props.inApp) this.setState({ failed: false });
      else window.location.reload();
    };
    return (
      <div className={this.props.inApp ? 'page' : 'page no-tabs'}>
        <div className="empty" role="alert" style={{ paddingTop: 'calc(var(--safe-top) + 72px)' }}>
          <div className="empty-icon">
            <TriangleAlert size={30} />
          </div>
          <h3>Something went wrong</h3>
          <p className="small">This screen couldn't load. Your workouts are still saved on this device.</p>
          <div className="stack" style={{ gap: 10, maxWidth: 280, margin: '20px auto 0' }}>
            <button className="btn btn-primary btn-block" onClick={() => go('#/')}>
              Go to Home
            </button>
            <button className="btn btn-tinted btn-block" onClick={() => go('#/settings')}>
              Open Settings
            </button>
          </div>
        </div>
      </div>
    );
  }
}
