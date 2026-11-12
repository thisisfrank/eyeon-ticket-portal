import { HttpError, readBody, route } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { assertRecordId, choiceId, getRecord, saveRecord, writeWithShapes } from './_lib/softr.js';
import { FROM, REPLY, TICKET } from './_lib/fields.js';
import { ticketOwnedBy, toReply, toTicket } from './_lib/records.js';
import { discardUploads, releaseUploads, saveWithFiles, uploadFiles } from './_lib/uploads.js';

export default route({
  async POST(req) {
    const user = requireUser(req);
    const input = readBody(req);
    const ticketId = assertRecordId(String(input.ticketId || ''));
    const message = String(input.message || '').trim();
    const hasFiles = Array.isArray(input.attachments) && input.attachments.length > 0;
    if (!message && !hasFiles) throw new HttpError(400, 'Write a message or attach a file.');
    if (message.length > 20000) throw new HttpError(400, 'That message is too long.');

    const ticket = toTicket(await getRecord('tickets', ticketId));
    const client = user.role === 'client';
    if (client && !ticketOwnedBy(ticket, user.email)) throw new HttpError(404, 'Ticket not found.');

    const author = client ? ticket.clientName || user.email : process.env.TEAM_NAME || 'Team';
    const values = {
      [REPLY.message]: message,
      [REPLY.from]: await choiceId('replies', REPLY.from, client ? FROM.client : FROM.team),
      [REPLY.author]: author,
    };

    const files = await uploadFiles(input.attachments);
    let record;
    try {
      // The linked-record write shape is undocumented; try the likely forms.
      record = await writeWithShapes('reply:ticket', [[ticketId], [{ id: ticketId }]], (link) =>
        saveWithFiles('reply', files, (attachmentValue) =>
          saveRecord('replies', null, { ...values, [REPLY.ticket]: link, [REPLY.attachments]: attachmentValue })
        )
      );
    } catch (error) {
      await discardUploads(files);
      throw error;
    }
    await releaseUploads(files, record?.fields?.[REPLY.attachments]);

    const lastReplyAt = new Date().toISOString();
    try {
      await saveRecord('tickets', ticketId, { [TICKET.lastReplyBy]: author, [TICKET.lastReplyAt]: lastReplyAt });
    } catch (error) {
      console.error('Reply saved, but the ticket summary fields were not updated', error);
    }

    return {
      reply: { ...toReply(record), ticketId },
      ticketPatch: { id: ticketId, lastReplyBy: author, lastReplyAt },
    };
  },
});
