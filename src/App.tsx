import { useEffect, useState } from 'react';
import { SIGNED_OUT_EVENT, api } from './api';
import type { Session } from './types';
import { Login } from './components/Login';
import { Board } from './components/Board';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((result) =>
        setSession(result.user && result.features ? { user: result.user, features: result.features } : null)
      )
      .catch(() => setSession(null))
      .finally(() => setChecking(false));

    const signedOut = () => setSession(null);
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, []);

  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      setSession(null);
    }
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent-fill" aria-label="Loading" />
      </div>
    );
  }

  if (!session) return <Login onSignedIn={setSession} />;
  return (
    <Board
      key={`${session.user.role}:${session.user.email || ''}`}
      session={session}
      onSignOut={signOut}
    />
  );
}
