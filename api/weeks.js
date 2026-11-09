import { HttpError, readBody, route } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { listRecords, saveRecord } from './_lib/softr.js';
import { WEEK } from './_lib/fields.js';
import { toWeek } from './_lib/records.js';

// Developer-only: weekly miscellaneous time and notes, one row per week.
export default route({
  async POST(req) {
    requireUser(req, 'developer');
    const input = readBody(req);
    const weekStart = String(input.weekStart || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new HttpError(400, 'Invalid week.');

    const values = {};
    if ('misc' in input) {
      const misc = Number(input.misc);
      if (!Number.isFinite(misc)) throw new HttpError(400, 'Invalid time.');
      values[WEEK.misc] = Math.max(0, Math.round(misc));
    }
    if ('timerStarted' in input) {
      const started = input.timerStarted;
      if (started !== null && Number.isNaN(Date.parse(String(started)))) throw new HttpError(400, 'Invalid timer start.');
      values[WEEK.timerStarted] = started === null ? null : new Date(String(started)).toISOString();
    }
    if ('note' in input) values[WEEK.note] = String(input.note ?? '').slice(0, 5000);

    const existing = (await listRecords('weeks')).map(toWeek).find((week) => week.weekStart === weekStart);
    const record = existing
      ? await saveRecord('weeks', existing.id, values)
      : await saveRecord('weeks', null, { [WEEK.weekStart]: weekStart, ...values });
    return { week: toWeek(record) };
  },
});
