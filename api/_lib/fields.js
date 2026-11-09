// Softr field names this portal reads and writes. Field IDs are looked up
// from the table schema at runtime, so if a field is renamed in Softr, change
// the name here and nothing else.

export const TICKET = {
  number: 'Ticket #',
  type: 'Type',
  description: 'Description',
  attachments: 'Attachments',
  status: 'Status',
  response: 'Response',
  submitted: 'Submitted',
  updated: 'Updated',
  replies: 'Replies',
  projectId: 'Airtable Project ID',
  project: 'Project Name (text)',
  clientName: 'Client Name (text)',
  clientEmail: 'Client Email (text)',
  builderEmail: 'Builder Email (text)',
  lastReplyBy: 'Last Reply By',
  lastReplyAt: 'Last Reply At',
  internalNotes: 'Internal notes (team only)',
  rank: 'Board Rank',
  timeSpent: 'Time Spent',
  timerStarted: 'Timer Started',
  working: 'Working',
};

export const REPLY = {
  message: 'Message',
  ticket: 'Ticket',
  from: 'From',
  attachments: 'Attachments',
  posted: 'Posted',
  author: 'Author',
};

export const WEEK = {
  weekStart: 'Week Start',
  misc: 'Miscellaneous',
  timerStarted: 'Timer Started',
  note: 'Note',
};

// Choice labels used by the Status and From select fields.
export const STATUS = { new: 'New', answered: 'Answered', closed: 'Closed' };
export const FROM = { client: 'Client', team: 'Team' };
