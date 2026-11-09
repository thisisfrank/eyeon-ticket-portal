import type { Role, Ticket } from '../types';

export const COLUMNS = [
  { id: 'New', label: 'New', clientLabel: 'New', color: '#3b6fd8' },
  { id: 'Working', label: 'Working', clientLabel: 'In progress', color: '#5aa344' },
  { id: 'Answered', label: 'Answered', clientLabel: 'Answered', color: '#d49a1c' },
  { id: 'Closed', label: 'Closed', clientLabel: 'Closed', color: '#9b9b95' },
] as const;

export type ColumnId = (typeof COLUMNS)[number]['id'];

/** Status values stored in Softr. "Working" is a separate checkbox, not a status. */
export const STATUSES = ['New', 'Answered', 'Closed'] as const;

export function columnOf(ticket: Ticket): ColumnId | null {
  if (ticket.working) return 'Working';
  return (STATUSES as readonly string[]).includes(ticket.status || '') ? (ticket.status as ColumnId) : null;
}

export function columnLabel(id: ColumnId, role: Role): string {
  const column = COLUMNS.find((item) => item.id === id)!;
  return role === 'client' ? column.clientLabel : column.label;
}

export const TYPE_COLORS: Record<string, string> = {
  'Feature Request': '#2f9e78',
  'Small Tweak': '#d49a1c',
  'Possible Bug': '#d23b2a',
  'General Feedback': '#5b8fd6',
};

export const TYPE_HINTS: Record<string, string> = {
  'Feature Request': 'Something new you’d like added',
  'Small Tweak': 'A quick change to something that exists',
  'Possible Bug': 'Something isn’t working the way it should',
  'General Feedback': 'Questions, thoughts, anything else',
};
