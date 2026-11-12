import type { ReactNode } from 'react';
import { BRAND } from '../brand';

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label={`${BRAND.company} ${BRAND.product}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink" aria-hidden>
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-accent-fill">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        </span>
      </span>
      <span className="font-display text-[19px] font-extrabold tracking-tight text-ink">
        {BRAND.wordmark}
        <span className="text-faint"> {BRAND.product}</span>
      </span>
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-accent">{children}</p>;
}
