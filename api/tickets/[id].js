import { HttpError, readBody, route } from '../_lib/http.js';
import { requireUser } from '../_lib/session.js';
import { assertRecordId, choiceId, saveRecord } from '../_lib/softr.js';
import { TICKET } from '../_lib/fields.js';
import { forViewer, toTicket } from '../_lib/records.js';

function isoOrNull(value) {
  if (value === null) return null;
  const time = Date.parse(String(value));
  if (Number.isNaN(time)) throw new HttpError(400, 'Invalid timer start.');
  return new Date(time).toISOString();
}

// Developer-only updates: board moves, ordering, timers and team notes.
export default route({
  async PATCH(req) {
    const user = requireUser(req, 'developer');
    const id = assertRecordId(String(req.query.id || ''));
    const input = readBody(req);
    const values = {};

    if ('status' in input) values[TICKET.status] = await choiceId('tickets', TICKET.status, String(input.status));
    if ('working' in input) values[TICKET.working] = input.working === true;
    if ('rank' in input) {
      const rank = Number(input.rank);
      if (!Number.isFinite(rank)) throw new HttpError(400, 'Invalid rank.');
      values[TICKET.rank] = Math.round(rank);
    }
    if ('timeSpent' in input) {
      const spent = Number(input.timeSpent);
      if (!Number.isFinite(spent)) throw new HttpError(400, 'Invalid time.');
      values[TICKET.timeSpent] = Math.max(0, Math.round(spent));
    }
    if ('timerStarted' in input) values[TICKET.timerStarted] = isoOrNull(input.timerStarted);
    if ('internalNotes' in input) values[TICKET.internalNotes] = String(input.internalNotes ?? '').slice(0, 20000);

    if (Object.keys(values).length === 0) throw new HttpError(400, 'Nothing to update.');
    const record = await saveRecord('tickets', id, values);
    return { ticket: forViewer(toTicket(record), user) };
  },
});
