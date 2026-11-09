import { REPLY, TICKET, WEEK } from './fields.js';
import { SOFTR_FILE_ORIGIN } from './softr.js';

// Turns raw Softr records into the shapes the browser uses, and strips
// team-only fields before anything is sent to a client.

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'label' in value) return String(value.label ?? '');
  return '';
}

function label(value) {
  if (value && typeof value === 'object' && 'label' in value) return value.label ? String(value.label) : null;
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

function linkIds(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean);
}

export function seconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value !== 'string' || !value) return 0;
  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function pickThumb(thumbnails) {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const bySize = (size) => thumbnails.find((thumb) => thumb?.size === size)?.url;
  return bySize('large') || bySize('medium') || thumbnails[0]?.url || null;
}

export function attachments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((file) => file && typeof file.url === 'string')
    .map((file) => ({
      id: String(file.id || file.url),
      filename: file.filename || 'file',
      type: file.type || '',
      size: Number(file.size) || 0,
      url: file.url.startsWith(SOFTR_FILE_ORIGIN)
        ? `/api/file?path=${encodeURIComponent(file.url.slice(SOFTR_FILE_ORIGIN.length))}`
        : file.url,
      thumb: pickThumb(file.thumbnails),
    }));
}

export function toTicket(record) {
  const f = record.fields || {};
  const number = f[TICKET.number];
  return {
    id: record.id,
    number: typeof number === 'number' ? number : Number(text(number)) || null,
    type: label(f[TICKET.type]),
    description: text(f[TICKET.description]),
    status: label(f[TICKET.status]),
    working: f[TICKET.working] === true,
    project: text(f[TICKET.project]),
    clientName: text(f[TICKET.clientName]),
    clientEmail: text(f[TICKET.clientEmail]).trim().toLowerCase(),
    submitted: text(f[TICKET.submitted]) || record.createdAt || '',
    updated: text(f[TICKET.updated]) || record.updatedAt || '',
    response: text(f[TICKET.response]),
    attachments: attachments(f[TICKET.attachments]),
    lastReplyAt: text(f[TICKET.lastReplyAt]) || null,
    lastReplyBy: text(f[TICKET.lastReplyBy]),
    replyIds: linkIds(f[TICKET.replies]),
    // Team-only below
    rank: typeof f[TICKET.rank] === 'number' ? f[TICKET.rank] : null,
    timeSpent: seconds(f[TICKET.timeSpent]),
    timerStarted: text(f[TICKET.timerStarted]) || null,
    internalNotes: text(f[TICKET.internalNotes]),
    builderEmail: text(f[TICKET.builderEmail]),
    projectId: text(f[TICKET.projectId]),
  };
}

const TEAM_ONLY = ['rank', 'timeSpent', 'timerStarted', 'internalNotes', 'builderEmail', 'projectId', 'replyIds'];

export function forViewer(ticket, user) {
  if (user.role === 'developer') {
    const { replyIds: _replyIds, ...rest } = ticket;
    return rest;
  }
  const safe = { ...ticket };
  for (const key of TEAM_ONLY) delete safe[key];
  return safe;
}

export function toReply(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    ticketId: linkIds(f[REPLY.ticket])[0] || null,
    message: text(f[REPLY.message]),
    from: label(f[REPLY.from]) || 'Team',
    author: text(f[REPLY.author]),
    posted: text(f[REPLY.posted]) || record.createdAt || '',
    attachments: attachments(f[REPLY.attachments]),
  };
}

/** Keeps replies that belong to the given tickets (linked either way) and fills in ticketId. */
export function repliesFor(tickets, replies) {
  const ids = new Set(tickets.map((ticket) => ticket.id));
  const owner = new Map();
  for (const ticket of tickets) for (const replyId of ticket.replyIds || []) owner.set(replyId, ticket.id);
  return replies
    .map((reply) => ({ ...reply, ticketId: reply.ticketId && ids.has(reply.ticketId) ? reply.ticketId : owner.get(reply.id) || null }))
    .filter((reply) => reply.ticketId)
    .sort((a, b) => Date.parse(a.posted) - Date.parse(b.posted));
}

export function toWeek(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    weekStart: text(f[WEEK.weekStart]),
    misc: seconds(f[WEEK.misc]),
    timerStarted: text(f[WEEK.timerStarted]) || null,
    note: text(f[WEEK.note]),
  };
}

export function newestFirst(a, b) {
  return Date.parse(b.submitted) - Date.parse(a.submitted);
}
