import type { BoardData, Features, Reply, Role, Session, SessionUser, Ticket, UploadFile, Week } from './types';
import { ApiError } from './lib/errors';
import { demoBackend, isDemoActive } from './demo/backend';

export { ApiError, errorMessage } from './lib/errors';

export const SIGNED_OUT_EVENT = 'portal:signed-out';

export type TicketChanges = Partial<Pick<Ticket, 'status' | 'working' | 'rank' | 'timeSpent' | 'timerStarted' | 'internalNotes'>>;
export type WeekChanges = Partial<Pick<Week, 'misc' | 'timerStarted' | 'note'>>;
export interface NewTicketInput {
  type: string | null;
  description: string;
  project?: string;
  clientEmail?: string;
  attachments: UploadFile[];
}

/** Everything the UI needs from a server. The live one talks to /api; the demo one runs in the browser. */
export interface Backend {
  me(): Promise<{ user: SessionUser | null; features?: Features; demo?: boolean }>;
  login(role: Role, credential: string): Promise<Session>;
  logout(): Promise<{ ok: true }>;
  board(): Promise<BoardData>;
  createTicket(input: NewTicketInput): Promise<{ ticket: Ticket }>;
  updateTicket(id: string, changes: TicketChanges): Promise<{ ticket: Ticket }>;
  reply(
    ticketId: string,
    message: string,
    attachments: UploadFile[]
  ): Promise<{ reply: Reply; ticketPatch: Pick<Ticket, 'id' | 'lastReplyBy' | 'lastReplyAt'> }>;
  saveWeek(weekStart: string, changes: WeekChanges): Promise<{ week: Week }>;
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: init.method || 'GET',
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const text = await response.text();
  let data: { message?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && path !== 'login') window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    if (response.status === 413) throw new ApiError('Those files are too large. Try fewer or smaller images.', 413);
    throw new ApiError(data?.message || `Something went wrong (${response.status}).`, response.status);
  }
  return data as T;
}

const liveBackend: Backend = {
  me: () => request('me'),
  login: (role, credential) =>
    request('login', {
      method: 'POST',
      body: role === 'developer' ? { role, password: credential } : { role, email: credential },
    }),
  logout: () => request('logout', { method: 'POST' }),
  board: () => request('board'),
  createTicket: (input) => request('tickets', { method: 'POST', body: input }),
  updateTicket: (id, changes) => request(`tickets/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes }),
  reply: (ticketId, message, attachments) =>
    request('replies', { method: 'POST', body: { ticketId, message, attachments } }),
  saveWeek: (weekStart, changes) => request('weeks', { method: 'POST', body: { weekStart, ...changes } }),
};

const current = () => (isDemoActive() ? demoBackend : liveBackend);

export const api: Backend = {
  me: () => current().me(),
  login: (role, credential) => liveBackend.login(role, credential),
  logout: () => current().logout(),
  board: () => current().board(),
  createTicket: (input) => current().createTicket(input),
  updateTicket: (id, changes) => current().updateTicket(id, changes),
  reply: (ticketId, message, attachments) => current().reply(ticketId, message, attachments),
  saveWeek: (weekStart, changes) => current().saveWeek(weekStart, changes),
};
