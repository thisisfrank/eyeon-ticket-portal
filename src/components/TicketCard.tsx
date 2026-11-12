import type { DragEvent } from 'react';
import { GripVertical, MessageSquare, Paperclip } from 'lucide-react';
import type { Role, Ticket } from '../types';
import { formatDay, ticketTitle } from '../lib/format';
import { TYPE_COLORS } from '../lib/board';

interface Props {
  ticket: Ticket;
  role: Role;
  replyCount: number;
  waitingOnViewer: boolean;
  showProject: boolean;
  draggable: boolean;
  dragging: boolean;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
}

export function TypeTag({ type }: { type: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-body">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#9b9b95' }} />
      {type}
    </span>
  );
}

export function TicketCard(props: Props) {
  const { ticket, role, replyCount, waitingOnViewer, showProject, draggable, dragging, onOpen } = props;
  const title = ticketTitle(ticket.description);
  const developer = role === 'developer';
  const meta = developer ? [ticket.project || 'No project', ticket.clientName].filter(Boolean).join(' · ') : showProject ? ticket.project : '';

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Ticket ${ticket.number ?? ''}: ${title}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        props.onDragStart?.();
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`group relative rounded-xl border bg-card p-4 shadow-card transition ${
        dragging ? 'opacity-40' : 'hover:-translate-y-px hover:border-line-strong hover:shadow-lift'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${waitingOnViewer ? 'border-accent-fill/60' : 'border-line'}`}
    >
      {draggable && (
        <GripVertical className="absolute left-1 top-4 h-4 w-4 text-faint opacity-0 transition group-hover:opacity-100" aria-hidden />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted">
          <span className="font-semibold text-body">#{ticket.number ?? '—'}</span>
          {formatDay(ticket.submitted) && <span> &middot; {formatDay(ticket.submitted)}</span>}
        </span>
        {ticket.type && <TypeTag type={ticket.type} />}
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink" title={title}>
        {title}
      </h3>
      {meta && <p className="mt-1 truncate text-xs text-muted">{meta}</p>}

      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1" title={`${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}>
          <MessageSquare className="h-3.5 w-3.5" />
          {replyCount}
        </span>
        {ticket.attachments.length > 0 && (
          <span className="inline-flex items-center gap-1" title={`${ticket.attachments.length} attachments`}>
            <Paperclip className="h-3.5 w-3.5" />
            {ticket.attachments.length}
          </span>
        )}
        {waitingOnViewer && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-fill" />
            {developer ? 'Client replied' : 'New reply'}
          </span>
        )}
      </div>
    </article>
  );
}
