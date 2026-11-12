import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { api, ApiError, errorMessage } from '../api';
import type { Role, Session } from '../types';
import { Eyebrow, Wordmark } from './Brand';

const STEPS = ['Submit a Ticket', 'Watch the Progress', 'See Your Weekly Usage'];

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
    <div className="flex min-h-screen flex-col bg-night text-white">
      <header className="mx-auto flex w-full max-w-[1240px] items-center px-4 py-6 sm:px-10">
        <Wordmark tone="dark" />
      </header>

      <main className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-12 px-4 pb-16 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <section className="animate-rise">
          <Eyebrow tone="dark">{developer ? 'Team access' : 'Client support portal'}</Eyebrow>
          <h1 className="display mt-5 text-[clamp(40px,6.2vw,78px)] leading-[0.98]">
            Tell us what&rsquo;s broken. We&rsquo;ll take it from there.
          </h1>
          <ol className="mt-10 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-3">
            {STEPS.map((title) => (
              <li key={title} className="rounded-2xl border border-night-line bg-night-2 p-5">
                <p className="font-display text-[17px] font-bold leading-snug tracking-tight">{title}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="animate-rise rounded-3xl border border-night-line bg-night-2 p-6 sm:p-9" style={{ animationDelay: '60ms' }}>
          <h2 className="font-display text-[26px] font-bold tracking-tight">{developer ? 'Developer sign in' : 'Client Login'}</h2>
          <p className="mt-2 text-[15px] text-white/55">
            {developer ? 'Enter your email and the team password.' : 'Sign in With Your Whitelisted Email'}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {developer ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/70">Email address</span>
                  <input
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-night-line bg-night px-4 text-[15px] text-white placeholder:text-white/30 transition focus:border-accent-fill focus:shadow-glow focus:outline-none"
                    placeholder="you@company.com"
                    required
                    autoFocus={!focusPassword}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/70">Team password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-night-line bg-night px-4 text-[15px] text-white placeholder:text-white/30 transition focus:border-accent-fill focus:shadow-glow focus:outline-none"
                    placeholder="••••••••"
                    required
                    autoFocus={focusPassword}
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/70">Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-night-line bg-night px-4 text-[15px] text-white placeholder:text-white/30 transition focus:border-accent-fill focus:shadow-glow focus:outline-none"
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-orange-900/60 bg-orange-950/40 px-4 py-3 text-sm text-orange-200">
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
              className="mx-auto flex h-11 items-center justify-center rounded-full border border-night-line px-6 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              {developer ? 'Client sign in' : 'Developer login'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
