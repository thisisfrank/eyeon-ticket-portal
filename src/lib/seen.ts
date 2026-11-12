import type { Reply, SessionUser } from '../types';

// Which threads a viewer has read, kept in this browser only
// (ticket id -> newest reply time seen). Used for the "New reply" badges.
export type SeenMap = Record<string, number>;

export function seenKeyFor(user: Pick<SessionUser, 'role' | 'email'>): string {
  return `portal-seen:${user.role}:${user.email || 'team'}`;
}

export function readSeen(key: string): SeenMap | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SeenMap) : null;
  } catch {
    return null;
  }
}

export function writeSeen(key: string, seen: SeenMap) {
  try {
    localStorage.setItem(key, JSON.stringify(seen));
  } catch {
    // Storage blocked: badges just won't persist across visits.
  }
}

export function newestReplyTimes(replies: Reply[]): SeenMap {
  const times: SeenMap = {};
  for (const reply of replies) {
    if (!reply.ticketId) continue;
    times[reply.ticketId] = Math.max(times[reply.ticketId] || 0, Date.parse(reply.posted) || 0);
  }
  return times;
}
