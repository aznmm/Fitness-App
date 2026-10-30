import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { requestPersistentStorage } from './store/storage';
import { useStore } from './store/useStore';
import { initSync } from './sync/engine';
import '@fontsource-variable/inter';
import './styles.css';

/** Hold rendering until saved data has loaded from IndexedDB. */
function Root() {
  const [ready, setReady] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    if (ready) {
      void initSync();
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => setReady(true));
    if (useStore.persist.hasHydrated()) setReady(true);
    return unsub;
  }, [ready]);
  return ready ? (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  ) : (
    <div className="splash">Loading…</div>
  );
}

requestPersistentStorage();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
