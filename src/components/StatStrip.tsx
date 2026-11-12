import type { ReactNode } from 'react';
import { formatDuration, type BoardStats, type ClientStats } from '../lib/stats';

interface Props {
  stats: BoardStats;
  needsReplyActive: boolean;
  onToggleNeedsReply: () => void;
}

const LANE = 'min-w-[calc(100vw-56px)] flex-1 border border-transparent px-4 py-4 sm:min-w-[288px]';

function Stat({ value, label, hint, children }: { value: ReactNode; label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className={`${LANE} text-left`}>
      <p className="display text-[clamp(34px,3.6vw,52px)] leading-none text-accent-fill">{value}</p>
      <p className="eyebrow mt-2.5 text-[11px] tracking-[0.16em] text-muted">{label}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
      {children}
    </div>
  );
}

/** Headline numbers for the developer board, in the style of the site's stat band. */
export function StatStrip({ stats, needsReplyActive, onToggleNeedsReply }: Props) {
  const firstReply = stats.firstReplyMs == null ? '—' : formatDuration(stats.firstReplyMs);

  return (
    <div className="mb-4 flex w-full gap-4 border-t border-line">
      <button
        type="button"
        onClick={onToggleNeedsReply}
        aria-pressed={needsReplyActive}
        className={`${LANE} rounded-2xl text-left transition ${needsReplyActive ? 'bg-accent-soft' : 'hover:bg-card/70'}`}
        title={needsReplyActive ? 'Show all tickets' : 'Show only tickets that need a reply'}
      >
        <p className="display text-[clamp(34px,3.6vw,52px)] leading-none text-accent-fill">{stats.needsReply}</p>
        <p className="eyebrow mt-2.5 text-[11px] tracking-[0.16em] text-muted">Need a reply</p>
        <span className="mt-1 block text-xs font-medium text-accent">
          {needsReplyActive ? 'Showing these only · Clear' : stats.needsReply > 0 ? 'Show only these →' : 'All caught up'}
        </span>
      </button>
      <Stat value={stats.open} label="Open tickets" hint="New, working and answered" />
      <Stat value={stats.newThisWeek} label="New this week" hint="Submitted in the last 7 days" />
      <Stat
        value={firstReply}
        label="Typical first reply"
        hint={stats.firstReplySample ? `Median of ${stats.firstReplySample} tickets, last 90 days` : 'No replies in the last 90 days'}
      />
    </div>
  );
}

interface ClientProps {
  stats: ClientStats;
  active: boolean;
  onToggle: () => void;
}

function ClientFigure({ value, label, hint }: { value: ReactNode; label: string; hint: string }) {
  return (
    <div className="min-w-0 px-1 py-4 text-left sm:px-4">
      <p className="display text-[clamp(28px,8vw,52px)] leading-none text-accent-fill">{value}</p>
      <p className="eyebrow mt-2.5 text-[10px] tracking-[0.14em] text-muted sm:text-[11px] sm:tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </div>
  );
}

/** Headline numbers for the client board. Waiting on you filters the columns. */
export function ClientStatStrip({ stats, active, onToggle }: ClientProps) {
  return (
    <div className="mx-auto mb-4 grid w-full max-w-[1600px] grid-cols-3 gap-2 border-t border-line px-4 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`min-w-0 rounded-2xl px-1 py-4 text-left transition sm:px-4 ${active ? 'bg-accent-soft' : 'hover:bg-card/70'}`}
        title={active ? 'Show all tickets' : 'Show only tickets waiting on you'}
      >
        <p className="display text-[clamp(28px,8vw,52px)] leading-none text-accent-fill">{stats.waiting}</p>
        <p className="eyebrow mt-2.5 text-[10px] tracking-[0.14em] text-muted sm:text-[11px] sm:tracking-[0.16em]">Waiting on you</p>
        <span className="mt-1 block text-xs font-medium text-accent">
          {active ? 'Showing these · Clear' : stats.waiting > 0 ? 'Show these →' : 'All caught up'}
        </span>
      </button>
      <ClientFigure value={stats.open} label="Still open" hint="New, in progress, and answered" />
      <ClientFigure value={stats.closedThisWeek} label="Closed this week" hint="Closed in the last 7 days" />
    </div>
  );
}
