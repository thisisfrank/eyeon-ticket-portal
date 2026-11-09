import { HttpError, readBody, route } from '../_lib/http.js';
import { requireUser } from '../_lib/session.js';
import { choiceId, listRecords, saveRecord } from '../_lib/softr.js';
import { STATUS, TICKET } from '../_lib/fields.js';
import { forViewer, newestFirst, toTicket } from '../_lib/records.js';
import { discardUploads, releaseUploads, saveWithFiles, uploadFiles } from '../_lib/uploads.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create a ticket. Clients file tickets for themselves; project and contact
// details are copied from their most recent ticket so Softr automations that
// rely on them keep working.
export default route({
  async POST(req) {
    const user = requireUser(req);
    const input = readBody(req);

    const description = String(input.description || '').trim();
    if (!description) throw new HttpError(400, 'Describe what you need help with.');
    if (description.length > 20000) throw new HttpError(400, 'That description is too long.');

    const owner = user.role === 'client' ? user.email : String(input.clientEmail || '').trim().toLowerCase();
    if (owner && !EMAIL.test(owner)) throw new HttpError(400, 'Enter a valid client email.');

    const history = owner
      ? (await listRecords('tickets')).map(toTicket).filter((ticket) => ticket.clientEmail === owner).sort(newestFirst)
      : [];
    const projects = [...new Set(history.map((ticket) => ticket.project).filter(Boolean))];
    const requested = String(input.project || '').trim();
    const project =
      user.role === 'developer'
        ? requested || history[0]?.project || ''
        : projects.includes(requested)
          ? requested
          : history[0]?.project || '';
    const source = history.find((ticket) => ticket.project === project) || history[0];
    const sameProject = source?.project === project;

    const values = {
      [TICKET.description]: description,
      [TICKET.status]: await choiceId('tickets', TICKET.status, STATUS.new),
      [TICKET.type]: input.type ? await choiceId('tickets', TICKET.type, input.type) : undefined,
      [TICKET.clientEmail]: owner || undefined,
      [TICKET.clientName]: source?.clientName || undefined,
      [TICKET.project]: project || undefined,
      [TICKET.projectId]: sameProject ? source?.projectId || undefined : undefined,
      [TICKET.builderEmail]: source?.builderEmail || undefined,
    };

    const files = await uploadFiles(input.attachments);
    let record;
    try {
      record = await saveWithFiles('ticket', files, (attachmentValue) =>
        saveRecord('tickets', null, { ...values, [TICKET.attachments]: attachmentValue })
      );
    } catch (error) {
      await discardUploads(files);
      throw error;
    }
    await releaseUploads(files, record?.fields?.[TICKET.attachments]);

    return { ticket: forViewer(toTicket(record), user) };
  },
});
