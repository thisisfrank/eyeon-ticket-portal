import { HttpError, route } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { getRecord, listRecords, settings, softrFetchFile } from './_lib/softr.js';
import { ticketOwnedBy, toReply, toTicket } from './_lib/records.js';

// Serves Softr-hosted attachments. Softr file URLs need the API key, so they
// go through here, and clients can only open files on their own tickets.
const FILE_PATH = /^v1\/attachments\/([\w-]+)\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)\/[A-Za-z0-9]+\/[\w-]+(?:\/[\w-]+)*$/;

async function clientOwns(email, tableKey, recordId) {
  const mine = (await listRecords('tickets', { maxAge: 30_000 }))
    .map(toTicket)
    .filter((ticket) => ticketOwnedBy(ticket, email));
  if (tableKey === 'tickets') return mine.some((ticket) => ticket.id === recordId);
  if (mine.some((ticket) => ticket.replyIds.includes(recordId))) return true;
  const reply = toReply(await getRecord('replies', recordId));
  return Boolean(reply.ticketId && mine.some((ticket) => ticket.id === reply.ticketId));
}

export default route({
  async GET(req, res) {
    const user = requireUser(req);
    const path = String(req.query.path || '');
    const match = FILE_PATH.exec(path);
    if (!match) throw new HttpError(400, 'Invalid file.');

    const [, databaseId, tableId, recordId] = match;
    const { databaseId: expectedDb, tables } = settings();
    const tableKey = tableId === tables.tickets ? 'tickets' : tableId === tables.replies ? 'replies' : null;
    if (databaseId !== expectedDb || !tableKey) throw new HttpError(404, 'File not found.');
    if (user.role === 'client' && !(await clientOwns(user.email, tableKey, recordId))) {
      throw new HttpError(404, 'File not found.');
    }

    const upstream = await softrFetchFile(path);
    const location = upstream.headers.get('location');
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      res.status(302);
      res.setHeader('Location', location);
      res.end();
      return;
    }
    if (!upstream.ok) throw new HttpError(upstream.status === 404 ? 404 : 502, 'Could not load that file.');

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  },
});
