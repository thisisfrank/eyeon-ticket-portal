import { ArrowLeftRight, RotateCcw, X } from 'lucide-react';
import type { Role } from '../types';

interface Props {
  role: Role;
  onSwitch: (role: Role) => void;
  onReset: () => void;
  onExit: () => void;
}

/** Strip shown above the demo board: says it's sample data and lets you flip between the two sides. */
export function DemoBanner({ role, onSwitch, onReset, onExit }: Props) {
  const other: Role = role === 'client' ? 'developer' : 'client';
  const button =
    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition hover:bg-white/10';

  return (
    <div className="bg-night text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <p className="flex min-w-0 items-center gap-2.5 text-[13px] text-white/70">
          <span className="eyebrow rounded-full bg-accent-fill px-2 py-0.5 text-[10px] tracking-[0.14em] text-accent-ink">Demo</span>
          <span>
            Viewing as {role === 'client' ? 'a client (Jordan at Meridian Concrete)' : 'a developer'}. Sample data, saved only in this
            browser.
          </span>
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onSwitch(other)} className={`${button} text-mint`}>
            <ArrowLeftRight className="h-3.5 w-3.5" />
            View as {other}
          </button>
          <button type="button" onClick={onReset} className={`${button} text-white/70`} title="Start over with fresh sample data">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button type="button" onClick={onExit} className={`${button} text-white/70`}>
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
