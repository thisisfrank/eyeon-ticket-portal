import type { Reply, Ticket } from '../types';
import { columnOf } from './board';

const DAY = 24 * 60 * 60 * 1000;

/**
 * An open ticket where the client spoke last, or a brand-new ticket nobody has
 * answered yet. Tickets already marked Working count as being handled.
 */
export function needsTeamReply(ticket: Ticket, thread: Reply[] | undefined): boolean {
  const column = columnOf(ticket);
  if (!column || column === 'Closed') return false;
  const last = thread?.[thread.length - 1];
  if (last) return last.from === 'Client';
  return column === 'New' && !ticket.response;
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export interface BoardStats {
  open: number;
  needsReply: number;
  newThisWeek: number;
  /** Median ms from a ticket being submitted to the team's first reply, over the last 90 days. */
  firstReplyMs: number | null;
  firstReplySample: number;
}

export function boardStats(tickets: Ticket[], repliesByTicket: Map<string, Reply[]>, now = Date.now()): BoardStats {
  let open = 0;
  let needsReply = 0;
  let newThisWeek = 0;
  const firstReplies: number[] = [];

  for (const ticket of tickets) {
    const column = columnOf(ticket);
    const thread = repliesByTicket.get(ticket.id);
    const submitted = Date.parse(ticket.submitted);
    if (column && column !== 'Closed') open += 1;
    if (needsTeamReply(ticket, thread)) needsReply += 1;
    if (submitted >= now - 7 * DAY) newThisWeek += 1;

    if (submitted >= now - 90 * DAY) {
      const first = thread?.find((reply) => reply.from !== 'Client');
      const gap = first ? Date.parse(first.posted) - submitted : NaN;
      if (Number.isFinite(gap) && gap >= 0) firstReplies.push(gap);
    }
  }

  firstReplies.sort((a, b) => a - b);
  const middle = Math.floor(firstReplies.length / 2);
  const firstReplyMs = firstReplies.length
    ? firstReplies.length % 2
      ? firstReplies[middle]
      : (firstReplies[middle - 1] + firstReplies[middle]) / 2
    : null;

  return { open, needsReply, newThisWeek, firstReplyMs, firstReplySample: firstReplies.length };
}
