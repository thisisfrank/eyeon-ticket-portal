import type { ReactNode } from 'react';
import { formatDuration, type BoardStats } from '../lib/stats';

interface Props {
  stats: BoardStats;
  needsReplyActive: boolean;
  onToggleNeedsReply: () => void;
}

function Stat({ value, label, hint, children }: { value: ReactNode; label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 px-0 py-4 sm:px-6 sm:first:pl-0">
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
    <div className="mt-8 grid grid-cols-2 gap-x-6 border-t border-line lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-line">
      <button
        type="button"
        onClick={onToggleNeedsReply}
        aria-pressed={needsReplyActive}
        className={`group -mx-2 rounded-2xl px-2 text-left transition sm:mx-0 sm:rounded-none sm:px-0 ${needsReplyActive ? 'bg-accent-soft' : 'hover:bg-card/70'}`}
        title={needsReplyActive ? 'Show all tickets' : 'Show only tickets that need a reply'}
      >
        <Stat value={stats.needsReply} label="Need a reply">
          <span className="mt-1 block text-xs font-medium text-accent">
            {needsReplyActive ? 'Showing these only · Clear' : stats.needsReply > 0 ? 'Show only these →' : 'All caught up'}
          </span>
        </Stat>
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
