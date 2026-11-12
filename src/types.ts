export type Role = 'client' | 'developer';

export interface SessionUser {
  role: Role;
  email: string | null;
  name: string | null;
}

export interface Features {
  uploads: boolean;
  weeks: boolean;
  recordUrl: string | null;
}

export interface Session {
  user: SessionUser;
  features: Features;
}

export interface Attachment {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  thumb: string | null;
}

export interface Ticket {
  id: string;
  number: number | null;
  type: string | null;
  description: string;
  status: string | null;
  working: boolean;
  project: string;
  clientName: string;
  clientEmail: string;
  submitted: string;
  updated: string;
  response: string;
  attachments: Attachment[];
  lastReplyAt: string | null;
  lastReplyBy: string;
  // Developer-only (never sent to clients)
  rank?: number | null;
  timeSpent?: number;
  timerStarted?: string | null;
  internalNotes?: string;
  builderEmail?: string;
  projectId?: string;
}

export interface Reply {
  id: string;
  ticketId: string | null;
  message: string;
  from: string;
  author: string;
  posted: string;
  attachments: Attachment[];
}

export interface Week {
  id: string;
  weekStart: string;
  misc: number;
  timerStarted: string | null;
  note: string;
}

export interface BoardData {
  tickets: Ticket[];
  replies: Reply[];
  weeks: Week[];
  types: string[];
}

export interface UploadFile {
  filename: string;
  contentType: string;
  data: string;
}

export interface PendingFile extends UploadFile {
  id: string;
  size: number;
  preview: string | null;
}
