import { useEffect, useState } from 'react';
import { SIGNED_OUT_EVENT, api } from './api';
import type { Role, Session } from './types';
import { endDemo, resetDemo, startDemo } from './demo/backend';
import { Login } from './components/Login';
import { Board } from './components/Board';

/** `?demo=client` or `?demo=developer` opens the demo directly (handy for sharing a link). */
function demoRoleFromUrl(): Role | null {
  const value = new URLSearchParams(window.location.search).get('demo');
  if (value === 'client') return 'client';
  if (value === 'developer' || value === 'dev') return 'developer';
  return null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [boardKey, setBoardKey] = useState(0);

  useEffect(() => {
    const linkedDemo = demoRoleFromUrl();
    if (linkedDemo) {
      setSession(startDemo(linkedDemo));
      setChecking(false);
    } else {
      api
        .me()
        .then((result) =>
          setSession(result.user && result.features ? { user: result.user, features: result.features, demo: result.demo } : null)
        )
        .catch(() => setSession(null))
        .finally(() => setChecking(false));
    }

    const signedOut = () => setSession(null);
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, []);

  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      endDemo();
      if (demoRoleFromUrl()) window.history.replaceState(null, '', window.location.pathname);
      setSession(null);
    }
  };

  const openDemo = (role: Role) => {
    setSession(startDemo(role));
    setBoardKey((key) => key + 1);
  };

  const restartDemo = () => {
    resetDemo();
    setBoardKey((key) => key + 1);
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-night">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent-fill" aria-label="Loading" />
      </div>
    );
  }

  if (!session) return <Login onSignedIn={setSession} onDemo={openDemo} />;
  return (
    <Board
      key={`${session.demo ? 'demo' : 'live'}:${session.user.role}:${session.user.email || ''}:${boardKey}`}
      session={session}
      onSignOut={signOut}
      onDemoSwitch={session.demo ? openDemo : undefined}
      onDemoReset={session.demo ? restartDemo : undefined}
    />
  );
}
