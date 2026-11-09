import type { Ticket } from '../types';

const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'dept', 'st', 'ave', 'inc', 'ltd', 'eg', 'ie', 'vs', 'etc']);

function firstSentence(text: string): string {
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') inQuotes = !inQuotes;
    if (inQuotes) continue;
    if (character === '!' || character === '?') return text.slice(0, index + 1).trim();
    if (character !== '.' || (index < text.length - 1 && text[index + 1] !== ' ')) continue;
    const word = text.slice(0, index).match(/[A-Za-z]+$/)?.[0]?.toLowerCase() || '';
    if (word.length === 1 || ABBREVIATIONS.has(word)) continue;
    return text.slice(0, index + 1).trim();
  }
  return text.trim();
}

/** A short title derived from the first sentence of the description. */
export function ticketTitle(description: string): string {
  const raw = description.replace(/\s+/g, ' ').trim();
  if (!raw) return 'Untitled ticket';
  const withoutGreeting = raw.replace(/^(hi|hello|hey)\s+[^,.!]{1,40}[,!]\s*/i, '').trim();
  const sentence = firstSentence(withoutGreeting || raw);
  return sentence.length > 140 ? `${sentence.slice(0, 137).trimEnd()}…` : sentence;
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// --- Time tracking -----------------------------------------------------------

export const QUARTER_HOUR_MS = 15 * 60 * 1000;

export function timerStartedMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Seconds to add when a timer stops: rounded up to the next 15 minutes, ignoring accidental clicks. */
export function roundedElapsedSeconds(startedMs: number): number {
  const elapsed = Math.max(0, Date.now() - startedMs);
  return elapsed < 15_000 ? 0 : Math.ceil(elapsed / QUARTER_HOUR_MS) * 15 * 60;
}

export function formatTracked(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function weekStartKey(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(copy.getDate()).padStart(2, '0');
  return `${copy.getFullYear()}-${month}-${dayOfMonth}`;
}

export function shiftWeek(key: string, count: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return weekStartKey(new Date(year, month - 1, day + count * 7));
}

export function formatWeekRange(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const format = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(new Date(year, month - 1, day))} – ${format(new Date(year, month - 1, day + 6))}`;
}

// --- Ordering ----------------------------------------------------------------

/** Board Rank when set, otherwise newest first. */
export function orderKey(ticket: Ticket): number {
  if (typeof ticket.rank === 'number' && Number.isFinite(ticket.rank)) return ticket.rank;
  const time = Date.parse(ticket.submitted);
  return 2_000_000_000_000 - (Number.isFinite(time) ? time : 0);
}

export function compareTickets(a: Ticket, b: Ticket): number {
  return orderKey(a) - orderKey(b) || a.id.localeCompare(b.id);
}

export function rankBetween(previous?: Ticket, next?: Ticket): number {
  if (previous && next) {
    const start = orderKey(previous);
    const end = orderKey(next);
    const middle = start === end ? start + 1 : Math.round((start + end) / 2);
    return middle === start || middle === end ? start + 1 : middle;
  }
  if (previous) return orderKey(previous) + 1000;
  if (next) return orderKey(next) - 1000;
  return 1000;
}
