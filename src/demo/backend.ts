import type { Backend } from '../api';
import type { Attachment, BoardData, Features, Role, Session, SessionUser, Ticket, UploadFile } from '../types';
import { ApiError } from '../lib/errors';
import { clearSeen, seenKeyFor, writeSeen } from '../lib/seen';
import { DEMO_CLIENT, DEMO_TEAM_NAME, DEMO_TYPES, createDemoDb, demoSeenMaps, type DemoDb } from './seed';

// A browser-only stand-in for the /api server, used by the demo accounts.
// Data lives in localStorage (falling back to memory) and never reaches Softr.

const ROLE_KEY = 'portal-demo-role';
const DATA_KEY = 'portal-demo-data';
const DEMO_USERS: Record<Role, SessionUser> = {
  client: { role: 'client', email: DEMO_CLIENT.email, name: DEMO_CLIENT.name },
  developer: { role: 'developer', email: null, name: 'Demo Developer' },
};
const DEMO_FEATURES: Record<Role, Features> = {
  client: { uploads: true, weeks: false, recordUrl: null },
  developer: { uploads: true, weeks: true, recordUrl: null },
};

let memoryRole: Role | null = null;
let memoryDb: DemoDb | null = null;

function storage(kind: 'session' | 'local'): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function currentRole(): Role | null {
  try {
    const stored = storage('session')?.getItem(ROLE_KEY);
    if (stored === 'client' || stored === 'developer') return stored;
  } catch {
    // fall through to memory
  }
  return memoryRole;
}

export function isDemoActive(): boolean {
  return currentRole() !== null;
}

function loadDb(): DemoDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = storage('local')?.getItem(DATA_KEY);
    if (raw) return (memoryDb = JSON.parse(raw) as DemoDb);
  } catch {
    // corrupt or blocked: reseed below
  }
  const fresh = createDemoDb();
  const seen = demoSeenMaps(fresh);
  writeSeen(seenKeyFor(DEMO_USERS.client, true), seen.client);
  writeSeen(seenKeyFor(DEMO_USERS.developer, true), seen.developer);
  saveDb(fresh);
  return fresh;
}

function saveDb(db: DemoDb) {
  memoryDb = db;
  try {
    storage('local')?.setItem(DATA_KEY, JSON.stringify(db));
  } catch {
    // Quota (large images) or blocked storage: keep the change in memory for this page.
  }
}

export function startDemo(role: Role): Session {
  memoryRole = role;
  try {
    storage('session')?.setItem(ROLE_KEY, role);
  } catch {
    // memory only
  }
  loadDb();
  return { user: DEMO_USERS[role], features: DEMO_FEATURES[role], demo: true };
}

export function endDemo() {
  memoryRole = null;
  try {
    storage('session')?.removeItem(ROLE_KEY);
  } catch {
    // ignore
  }
}

/** Throw away every change and start the demo over with fresh sample data. */
export function resetDemo() {
  memoryDb = null;
  try {
    storage('local')?.removeItem(DATA_KEY);
  } catch {
    // ignore
  }
  clearSeen(seenKeyFor(DEMO_USERS.client, true));
  clearSeen(seenKeyFor(DEMO_USERS.developer, true));
  loadDb();
}

// ---------------------------------------------------------------------------

const pause = (ms = 220) => new Promise((done) => setTimeout(done, ms));

function requireRole(role?: Role): Role {
  const active = currentRole();
  if (!active) throw new ApiError('The demo has ended. Start it again from the sign-in page.', 401);
  if (role && active !== role) throw new ApiError('Only developers can do that.', 403);
  return active;
}

const TEAM_ONLY: (keyof Ticket)[] = ['rank', 'timeSpent', 'timerStarted', 'internalNotes', 'builderEmail', 'projectId'];

function forViewer(ticket: Ticket, role: Role): Ticket {
  if (role === 'developer') return { ...ticket };
  const safe = { ...ticket };
  for (const key of TEAM_ONLY) delete safe[key];
  return safe;
}

function toAttachments(files: UploadFile[]): Attachment[] {
  return files.map((file, index) => ({
    id: `demo-upload-${Date.now()}-${index}`,
    filename: file.filename,
    type: file.contentType,
    size: Math.round((file.data.length * 3) / 4),
    url: `data:${file.contentType};base64,${file.data}`,
    thumb: null,
  }));
}

function findTicket(db: DemoDb, id: string, role: Role): Ticket {
  const ticket = db.tickets.find((item) => item.id === id);
  if (!ticket || (role === 'client' && ticket.clientEmail !== DEMO_CLIENT.email)) throw new ApiError('Ticket not found.', 404);
  return ticket;
}

export const demoBackend: Backend = {
  async me() {
    const role = currentRole();
    return role ? { user: DEMO_USERS[role], features: DEMO_FEATURES[role], demo: true } : { user: null };
  },

  async login() {
    throw new ApiError('Use the demo buttons to open a demo account.', 400);
  },

  async logout() {
    endDemo();
    return { ok: true };
  },

  async board(): Promise<BoardData> {
    const role = requireRole();
    await pause(350);
    const db = loadDb();
    const tickets = role === 'client' ? db.tickets.filter((ticket) => ticket.clientEmail === DEMO_CLIENT.email) : db.tickets;
    const ids = new Set(tickets.map((ticket) => ticket.id));
    return {
      tickets: tickets.map((ticket) => forViewer(ticket, role)),
      replies: db.replies.filter((reply) => reply.ticketId && ids.has(reply.ticketId)).map((reply) => ({ ...reply })),
      weeks: role === 'developer' ? db.weeks.map((week) => ({ ...week })) : [],
      types: DEMO_TYPES,
    };
  },

  async createTicket(input) {
    const role = requireRole();
    await pause();
    const description = input.description.trim();
    if (!description) throw new ApiError('Describe what you need help with.', 400);

    const db = loadDb();
    const owner = role === 'client' ? DEMO_CLIENT.email : (input.clientEmail || '').trim().toLowerCase();
    const history = db.tickets
      .filter((ticket) => owner && ticket.clientEmail === owner)
      .sort((a, b) => Date.parse(b.submitted) - Date.parse(a.submitted));
    const project = (input.project || '').trim() || history[0]?.project || '';
    const source = history.find((ticket) => ticket.project === project) || history[0];
    const now = new Date().toISOString();

    const ticket: Ticket = {
      id: `demo${Date.now()}`,
      number: db.nextNumber,
      type: input.type,
      description,
      status: 'New',
      working: false,
      project,
      clientName: source?.clientName || '',
      clientEmail: owner,
      submitted: now,
      updated: now,
      response: '',
      attachments: toAttachments(input.attachments),
      lastReplyAt: null,
      lastReplyBy: '',
      rank: null,
      timeSpent: 0,
      timerStarted: null,
      internalNotes: '',
      builderEmail: source?.builderEmail || '',
      projectId: '',
    };
    saveDb({ ...db, tickets: [ticket, ...db.tickets], nextNumber: db.nextNumber + 1 });
    return { ticket: forViewer(ticket, role) };
  },

  async updateTicket(id, changes) {
    const role = requireRole('developer');
    await pause(120);
    const db = loadDb();
    const ticket = { ...findTicket(db, id, role), ...changes, updated: new Date().toISOString() };
    saveDb({ ...db, tickets: db.tickets.map((item) => (item.id === id ? ticket : item)) });
    return { ticket: forViewer(ticket, role) };
  },

  async reply(ticketId, message, attachments) {
    const role = requireRole();
    await pause();
    if (!message.trim() && attachments.length === 0) throw new ApiError('Write a message or attach a file.', 400);
    const db = loadDb();
    const ticket = findTicket(db, ticketId, role);
    const client = role === 'client';
    const author = client ? ticket.clientName || DEMO_CLIENT.name : DEMO_TEAM_NAME;
    const posted = new Date().toISOString();
    const reply = {
      id: `demor${Date.now()}`,
      ticketId,
      message: message.trim(),
      from: client ? 'Client' : 'Team',
      author,
      posted,
      attachments: toAttachments(attachments),
    };
    saveDb({
      ...db,
      replies: [...db.replies, reply],
      tickets: db.tickets.map((item) => (item.id === ticketId ? { ...item, lastReplyBy: author, lastReplyAt: posted, updated: posted } : item)),
    });
    return { reply, ticketPatch: { id: ticketId, lastReplyBy: author, lastReplyAt: posted } };
  },

  async saveWeek(weekStart, changes) {
    requireRole('developer');
    await pause(120);
    const db = loadDb();
    const existing = db.weeks.find((week) => week.weekStart === weekStart);
    const week = existing
      ? { ...existing, ...changes }
      : { id: `demow${Date.now()}`, weekStart, misc: 0, timerStarted: null, note: '', ...changes };
    saveDb({ ...db, weeks: existing ? db.weeks.map((item) => (item.id === week.id ? week : item)) : [...db.weeks, week] });
    return { week };
  },
};
