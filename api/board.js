import { route } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { choices, listRecords, settings } from './_lib/softr.js';
import { TICKET } from './_lib/fields.js';
import { forViewer, repliesFor, toReply, toTicket, toWeek } from './_lib/records.js';

export default route({
  async GET(req) {
    const user = requireUser(req);
    const developer = user.role === 'developer';

    const [ticketRows, replyRows, weekRows, typeChoices] = await Promise.all([
      listRecords('tickets'),
      listRecords('replies'),
      developer && settings().tables.weeks ? listRecords('weeks') : Promise.resolve([]),
      choices('tickets', TICKET.type),
    ]);

    let tickets = ticketRows.map(toTicket);
    if (!developer) tickets = tickets.filter((ticket) => ticket.clientEmail && ticket.clientEmail === user.email);

    return {
      tickets: tickets.map((ticket) => forViewer(ticket, user)),
      replies: repliesFor(tickets, replyRows.map(toReply)),
      weeks: weekRows.map(toWeek),
      types: typeChoices.map((choice) => choice.label),
    };
  },
});
