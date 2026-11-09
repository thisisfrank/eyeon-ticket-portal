import type { Attachment, Reply, Ticket, Week } from '../types';
import { weekStartKey } from '../lib/format';

// Sample data for the demo. Dates are relative to "now" so the board always looks current.

export const DEMO_CLIENT = { email: 'jordan@meridianconcrete.com', name: 'Jordan Reyes' };
export const DEMO_TEAM_NAME = 'EyeOn Team';
export const DEMO_TYPES = ['Feature Request', 'Small Tweak', 'Possible Bug', 'General Feedback'];

export interface DemoDb {
  tickets: Ticket[];
  replies: Reply[];
  weeks: Week[];
  nextNumber: number;
}

const HOUR = 3600 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * HOUR).toISOString();

function mockScreenshot(id: string, label: string, accent: string, highlightRow: number): Attachment {
  const rows = Array.from({ length: 6 }, (_, index) => {
    const y = 132 + index * 62;
    const width = 180 + ((index * 53) % 220);
    return (
      `<rect x='32' y='${y}' width='736' height='48' rx='10' fill='#fff' stroke='#e3e3df'/>` +
      `<rect x='52' y='${y + 17}' width='${width}' height='14' rx='4' fill='#cdcdc7'/>` +
      `<rect x='660' y='${y + 15}' width='88' height='18' rx='9' fill='${accent}' opacity='0.75'/>`
    );
  }).join('');
  const highlightY = 124 + highlightRow * 62;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='560' viewBox='0 0 800 560'>` +
    `<rect width='800' height='560' fill='#f4f4f2'/>` +
    `<rect width='800' height='56' fill='#111'/>` +
    `<circle cx='34' cy='28' r='9' fill='${accent}'/>` +
    `<rect x='56' y='20' width='150' height='16' rx='4' fill='#fff' opacity='0.85'/>` +
    `<rect x='560' y='18' width='88' height='20' rx='10' fill='#fff' opacity='0.18'/>` +
    `<rect x='660' y='18' width='108' height='20' rx='10' fill='${accent}'/>` +
    `<rect x='32' y='84' width='280' height='22' rx='5' fill='#111'/>` +
    rows +
    `<rect x='22' y='${highlightY}' width='756' height='64' rx='14' fill='none' stroke='#d23b2a' stroke-width='4' stroke-dasharray='12 8'/>` +
    `<text x='32' y='536' font-family='Inter, Arial, sans-serif' font-size='17' fill='#6e6e69'>${label}</text>` +
    `</svg>`;
  return {
    id,
    filename: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
    type: 'image/svg+xml',
    size: svg.length,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    thumb: null,
  };
}

type Seed = Partial<Ticket> & Pick<Ticket, 'id' | 'number' | 'description'>;

const MERIDIAN = { clientEmail: DEMO_CLIENT.email, clientName: DEMO_CLIENT.name, project: 'Meridian Estimating Portal' };
const NORTHBAY = { clientEmail: 'sam@northbaylogistics.com', clientName: 'Sam Patel', project: 'Northbay Dispatch Board' };
const CEDAR = { clientEmail: 'dana@cedarridgedental.com', clientName: 'Dana Brooks', project: 'Cedar Ridge Patient Intake' };

function ticket(seed: Seed): Ticket {
  return {
    type: null,
    status: 'New',
    working: false,
    project: '',
    clientName: '',
    clientEmail: '',
    submitted: ago(1),
    updated: ago(1),
    response: '',
    attachments: [],
    lastReplyAt: null,
    lastReplyBy: '',
    rank: null,
    timeSpent: 0,
    timerStarted: null,
    internalNotes: '',
    builderEmail: 'builds@eyeonautomations.com',
    projectId: '',
    ...seed,
  };
}

function reply(id: string, ticketId: string, from: 'Client' | 'Team', author: string, posted: string, message: string, attachments: Attachment[] = []): Reply {
  return { id, ticketId, from, author, posted, message, attachments };
}

export function createDemoDb(): DemoDb {
  const tickets: Ticket[] = [
    // Meridian Concrete (the demo client)
    ticket({
      ...MERIDIAN,
      id: 'demo128',
      number: 128,
      type: 'Possible Bug',
      submitted: ago(0, 3),
      description:
        'The PDF export cuts off the last line item on long estimates.\n\nOn EST-SAMPLE-019 the final scope row is missing from page 3. It shows in the app, just not in the PDF. Screenshot attached.',
      attachments: [mockScreenshot('demo-att-1', 'PDF export, page 3', '#5aa344', 5)],
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo127',
      number: 127,
      type: 'Feature Request',
      submitted: ago(1, 2),
      description:
        'Could we add a Duplicate button on estimates? We reuse the same scope for most slab jobs and retyping it every time takes forever.',
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo125',
      number: 125,
      type: 'Small Tweak',
      working: true,
      submitted: ago(3),
      description: 'Can the project total show on the Estimates list? Right now we have to open each estimate to see it.',
      timeSpent: 45 * 60,
      internalNotes: 'Add a sortable Total column. Reuse the currency formatter from the PDF.',
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo122',
      number: 122,
      type: 'Possible Bug',
      status: 'Answered',
      submitted: ago(5),
      description: 'Uploading a takeoff spreadsheet fails when the first row is blank. We get "Could not read file" with no other detail.',
      attachments: [mockScreenshot('demo-att-2', 'Takeoff upload error', '#d49a1c', 0)],
      timeSpent: 90 * 60,
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo119',
      number: 119,
      type: 'General Feedback',
      status: 'Answered',
      submitted: ago(8),
      description: 'The new dashboard is great. The crew leads love seeing this week’s pours at a glance. Any chance it could work on phones too?',
      timeSpent: 15 * 60,
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo114',
      number: 114,
      type: 'Small Tweak',
      status: 'Closed',
      submitted: ago(14),
      description: 'Please change the "GC" label to "General Contractor" on the estimate PDF. A few customers asked what GC meant.',
      timeSpent: 30 * 60,
    }),
    ticket({
      ...MERIDIAN,
      id: 'demo110',
      number: 110,
      type: 'Feature Request',
      status: 'Closed',
      submitted: ago(21),
      description: 'We’d like an email when a customer approves an estimate, so the office knows to schedule the pour.',
      timeSpent: 3 * 60 * 60,
    }),

    // Other clients, visible to developers only
    ticket({
      ...NORTHBAY,
      id: 'demo126',
      number: 126,
      type: 'Possible Bug',
      submitted: ago(2),
      description: 'Drivers on Android can’t see the route map. It loads for a second, then goes blank. iPhones are fine.',
    }),
    ticket({
      ...NORTHBAY,
      id: 'demo124',
      number: 124,
      type: 'Feature Request',
      working: true,
      submitted: ago(4),
      description: 'Add a "Delayed" status for loads, with a reason field, so dispatch can see what’s held up at a glance.',
      timeSpent: 2 * 60 * 60,
      internalNotes: 'Client confirmed reasons: weather, mechanical, dock wait, other.',
    }),
    ticket({
      ...NORTHBAY,
      id: 'demo120',
      number: 120,
      type: 'Small Tweak',
      status: 'Answered',
      submitted: ago(6),
      description: 'Can the dispatch board refresh on its own? People keep forgetting to reload and miss new loads.',
      timeSpent: 60 * 60,
    }),
    ticket({
      ...CEDAR,
      id: 'demo123',
      number: 123,
      type: 'Small Tweak',
      working: true,
      submitted: ago(4, 6),
      description: 'On the intake form, make the insurance member ID optional. Self-pay patients get stuck on that step.',
      timeSpent: 30 * 60,
    }),
    ticket({
      ...CEDAR,
      id: 'demo117',
      number: 117,
      type: 'General Feedback',
      status: 'Closed',
      submitted: ago(11),
      description: 'Front desk says check-in is about twice as fast with the new forms. Thank you!',
    }),
  ];

  const replies: Reply[] = [
    reply('demor1', 'demo125', 'Team', DEMO_TEAM_NAME, ago(2, 20), 'On it. We’re adding a Total column you can sort by. It should be live tomorrow.'),
    reply('demor2', 'demo122', 'Team', DEMO_TEAM_NAME, ago(4, 20), 'Thanks for the screenshot, that made it quick to find. Blank rows at the top of a sheet are now skipped.'),
    reply('demor3', 'demo122', 'Client', DEMO_CLIENT.name, ago(3, 22), 'That file works now. One more: a sheet with merged header cells still fails. Want me to send it?'),
    reply('demor4', 'demo122', 'Team', DEMO_TEAM_NAME, ago(0, 5), 'Yes please, attach it here. We’ll handle merged headers the same way.'),
    reply('demor5', 'demo119', 'Team', DEMO_TEAM_NAME, ago(7, 21), 'Glad it’s landing well. A phone layout is a good next phase. We’ll send a short scope this week.'),
    reply('demor6', 'demo114', 'Team', DEMO_TEAM_NAME, ago(13, 22), 'Done. New PDFs say "General Contractor".'),
    reply('demor7', 'demo114', 'Client', DEMO_CLIENT.name, ago(12), 'Perfect, thanks!'),
    reply('demor8', 'demo110', 'Team', DEMO_TEAM_NAME, ago(20, 19), 'Approval emails are live. They go to office@ and include a link to the estimate.'),
    reply('demor9', 'demo120', 'Team', DEMO_TEAM_NAME, ago(5, 22), 'We can refresh every 60 seconds. Does that work, or do you need it faster during morning dispatch?'),
    reply('demor10', 'demo120', 'Client', NORTHBAY.clientName, ago(0, 2), 'Every 60 seconds is fine. Could it flash new loads so they stand out?'),
    reply('demor11', 'demo117', 'Team', DEMO_TEAM_NAME, ago(10, 20), 'Love hearing that. Thanks, Dana!'),
  ];

  for (const item of tickets) {
    const thread = replies.filter((entry) => entry.ticketId === item.id);
    const last = thread[thread.length - 1];
    if (last) {
      item.lastReplyAt = last.posted;
      item.lastReplyBy = last.author;
      item.updated = last.posted;
    }
  }

  const thisWeek = weekStartKey(new Date());
  const weeks: Week[] = [{ id: 'demow1', weekStart: thisWeek, misc: 45 * 60, timerStarted: null, note: 'Client calls, invoicing' }];

  return { tickets, replies, weeks, nextNumber: 129 };
}

/**
 * Which threads each demo viewer has already "read", so the demo opens with a
 * realistic couple of unread badges: Jordan has an unread team reply on #122,
 * and the developer has an unread client reply on #120.
 */
export function demoSeenMaps(db: DemoDb): Record<'client' | 'developer', Record<string, number>> {
  const newest: Record<string, number> = {};
  for (const entry of db.replies) {
    if (entry.ticketId) newest[entry.ticketId] = Math.max(newest[entry.ticketId] || 0, Date.parse(entry.posted));
  }
  const client = { ...newest };
  delete client.demo122;
  const developer = { ...newest };
  delete developer.demo120;
  return { client, developer };
}
