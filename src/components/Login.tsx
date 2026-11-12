import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { api, ApiError, errorMessage } from '../api';
import type { Role, Session } from '../types';
import { Eyebrow, Wordmark } from './Brand';
import { ThemeRoot, ThemeToggle } from '../theme';

const STEPS = [
  { number: '01', title: 'Submit a Ticket' },
  { number: '02', title: 'Watch the Progress' },
  { number: '03', title: 'See Your Weekly Usage' },
];

export function Login({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [role, setRole] = useState<Role>(() =>
    new URLSearchParams(window.location.search).has('team') ? 'developer' : 'client'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      onSignedIn(await api.login(role, { email, password }));
    } catch (loginError) {
      if (role === 'client' && loginError instanceof ApiError && loginError.code === 'developer') {
        setRole('developer');
        setFocusPassword(true);
        setError('This email is a developer account. Enter the team password.');
      } else {
        setError(errorMessage(loginError, 'Could not sign in.'));
      }
      setBusy(false);
    }
  };

  const switchRole = (next: Role) => {
    setRole(next);
    setFocusPassword(false);
    setError('');
  };

  const developer = role === 'developer';

  return (
    <ThemeRoot surface="login">
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-6 sm:px-10">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-10 px-4 pb-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-x-16 lg:gap-y-10">
        <section className="animate-rise">
          <Eyebrow>{developer ? 'Team access' : 'Client support portal'}</Eyebrow>
          <h1 className="display mt-5 text-[clamp(40px,6.2vw,78px)] leading-[0.98]">
            Tell us what&rsquo;s broken. We&rsquo;ll take it from there.
          </h1>
        </section>

        <ol className="order-2 hidden w-full gap-4 sm:grid sm:grid-cols-3 lg:order-none lg:col-span-2">
          {STEPS.map((step) => (
            <li key={step.number} className="rounded-2xl border border-line bg-card px-5 py-5">
              <span className="font-mono text-[11px] font-semibold text-accent">{step.number}</span>
              <p className="mt-3 whitespace-nowrap font-display text-[17px] font-bold tracking-tight">{step.title}</p>
            </li>
          ))}
        </ol>

        <section className="order-3 animate-rise rounded-3xl border border-line bg-card p-6 sm:p-9 lg:order-none" style={{ animationDelay: '60ms' }}>
          <h2 className="font-display text-[26px] font-bold tracking-tight">{developer ? 'Developer sign in' : 'Client Login'}</h2>
          {!developer && <p className="mt-2 text-[15px] text-muted">Sign in With Your Whitelisted Email</p>}

          <form onSubmit={submit} className="mt-7 space-y-4">
            {developer ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-body">Email address</span>
                  <input
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="field h-12 !bg-paper"
                    placeholder="you@company.com"
                    required
                    autoFocus={!focusPassword}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-body">Team password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="field h-12 !bg-paper"
                    placeholder="••••••••"
                    required
                    autoFocus={focusPassword}
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field h-12 !bg-paper"
                  placeholder="you@company.com"
                  aria-label="Email address"
                  required
                  autoFocus
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary h-12 w-full text-[15px] shadow-cta">
              {busy ? 'Checking…' : developer ? 'Open the board' : 'Continue'}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => switchRole(developer ? 'client' : 'developer')}
              className="mx-auto flex h-11 items-center justify-center rounded-full border border-line px-6 text-sm font-medium text-body transition hover:border-line-strong hover:text-ink"
            >
              {developer ? 'Client sign in' : 'Developer login'}
            </button>
          </form>
        </section>
      </main>
    </div>
    </ThemeRoot>
  );
}
