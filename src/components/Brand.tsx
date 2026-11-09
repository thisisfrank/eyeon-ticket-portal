import type { ReactNode } from 'react';
import { BRAND } from '../brand';

export function Wordmark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label={`${BRAND.company} ${BRAND.product}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone === 'dark' ? 'bg-white' : 'bg-ink'}`} aria-hidden>
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-accent-fill">
          <span className={`h-1.5 w-1.5 rounded-full ${tone === 'dark' ? 'bg-white' : 'bg-ink'}`} />
        </span>
      </span>
      <span className={`font-display text-[19px] font-extrabold tracking-tight ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
        {BRAND.wordmark}
        <span className={tone === 'dark' ? 'text-white/45' : 'text-faint'}> {BRAND.product}</span>
      </span>
    </span>
  );
}

export function Eyebrow({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return <p className={`eyebrow ${tone === 'dark' ? 'text-mint' : 'text-accent'}`}>{children}</p>;
}
