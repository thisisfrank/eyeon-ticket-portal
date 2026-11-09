import type { SyntheticEvent } from 'react';
import { Minus, Pause, Play, Plus } from 'lucide-react';
import { formatTracked, timerStartedMs } from '../lib/format';

interface Props {
  spent: number;
  timerStarted: string | null | undefined;
  now: number;
  busy: boolean;
  withSteps?: boolean;
  size?: 'sm' | 'md';
  onToggle: () => void;
  onAdjust: (minutes: number) => void;
}

/** Start/stop timer that saves in 15-minute steps, with optional -15 / +15 buttons. */
export function TimeControl({ spent, timerStarted, now, busy, withSteps = false, size = 'sm', onToggle, onAdjust }: Props) {
  const started = timerStartedMs(timerStarted);
  const running = started != null;
  const label = formatTracked(spent + (running ? Math.max(0, now - started) / 1000 : 0));
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  const box = size === 'md' ? 'h-8 min-w-8 text-xs' : 'h-6 min-w-6 text-[11px]';
  const step = `${box} inline-flex items-center justify-center rounded-md border border-line text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40`;

  return (
    <div className="inline-flex items-center gap-1" onClick={stop} onMouseDown={stop} onDragStart={(event) => event.preventDefault()}>
      {withSteps && (
        <button type="button" disabled={busy} onClick={() => onAdjust(-15)} className={step} title="Remove 15 minutes" aria-label="Remove 15 minutes">
          <Minus className="h-3 w-3" />
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onToggle}
        className={`${box} inline-flex items-center gap-1 rounded-md border px-2 font-mono font-medium transition disabled:opacity-40 ${
          running ? 'border-accent-fill bg-accent-soft text-accent' : 'border-line text-body hover:border-line-strong'
        }`}
        title={running ? 'Stop (saves in 15-minute steps)' : 'Start timer'}
      >
        {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {label}
      </button>
      {withSteps && (
        <button type="button" disabled={busy} onClick={() => onAdjust(15)} className={step} title="Add 15 minutes" aria-label="Add 15 minutes">
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
