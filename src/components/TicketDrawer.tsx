import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, ExternalLink, X } from 'lucide-react';
import { api, errorMessage } from '../api';
import type { Attachment, Features, PendingFile, Reply, Role, Ticket } from '../types';
import { formatWhen, ticketTitle } from '../lib/format';
import { COLUMNS, columnLabel, columnOf } from '../lib/board';
import { filesFromClipboard, prepareFiles, releasePreview, toUpload } from '../lib/files';
import { AttachButton, AttachmentList, PendingFiles } from './Files';
import { TimeControl } from './TimeControl';
import { TypeTag } from './TicketCard';

interface Props {
  ticket: Ticket;
  replies: Reply[];
  role: Role;
  features: Features;
  now: number;
  timerBusy: boolean;
  onClose: () => void;
  onReplied: (reply: Reply, patch: Partial<Ticket> & { id: string }) => void;
  onToggleTimer: () => void;
  onAdjustTimer: (minutes: number) => void;
  onSaveNotes: (notes: string) => void;
}

function Message({
  team,
  author,
  badge,
  when,
  text,
  attachments,
}: {
  team: boolean;
  author: string;
  badge: string;
  when?: string;
  text: string;
  attachments: Attachment[];
}) {
  return (
    <article className={`rounded-2xl p-4 ${team ? 'bg-night text-white' : 'border border-line bg-paper text-ink'}`}>
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{author}</span>
          <span className={`eyebrow shrink-0 text-[10px] ${team ? 'text-mint' : 'text-accent'}`}>{badge}</span>
        </div>
        {when && <time className={`shrink-0 font-mono text-[11px] ${team ? 'text-white/45' : 'text-faint'}`}>{formatWhen(when)}</time>}
      </header>
      {text && <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${team ? 'text-white/85' : 'text-body'}`}>{text}</p>}
      <AttachmentList files={attachments} tone={team ? 'dark' : 'light'} />
    </article>
  );
}

export function TicketDrawer(props: Props) {
  const { ticket, replies, role, features, now, timerBusy, onClose } = props;
  const developer = role === 'developer';
  const column = columnOf(ticket);
  const columnColor = COLUMNS.find((item) => item.id === column)?.color || '#9b9b95';

  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(ticket.internalNotes || '');
  const thread = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => () => filesRef.current.forEach(releasePreview), []);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }, [ticket.id, replies.length]);

  useEffect(() => {
    setNotes(ticket.internalNotes || '');
  }, [ticket.id, ticket.internalNotes]);

  const dirty = draft.trim().length > 0 || files.length > 0;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dirty) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, onClose]);

  const addFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setError('');
    try {
      const prepared = await prepareFiles(incoming, files);
      setFiles((current) => [...current, ...prepared]);
    } catch (fileError) {
      setError(errorMessage(fileError));
    }
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const file = current.find((item) => item.id === id);
      if (file) releasePreview(file);
      return current.filter((item) => item.id !== id);
    });
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!dirty || sending) return;
    setSending(true);
    setError('');
    try {
      const { reply, ticketPatch } = await api.reply(ticket.id, draft.trim(), toUpload(files));
      props.onReplied(reply, ticketPatch);
      files.forEach(releasePreview);
      setFiles([]);
      setDraft('');
    } catch (sendError) {
      setError(errorMessage(sendError, 'Your reply was not sent.'));
    } finally {
      setSending(false);
    }
  };

  const recordUrl = features.recordUrl ? features.recordUrl.replace('{id}', encodeURIComponent(ticket.id)) : null;
  const clientLabel = ticket.clientName || ticket.clientEmail || 'Client';

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Ticket ${ticket.number ?? ''}`}>
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-ink/25" onClick={onClose} aria-label="Close ticket" tabIndex={-1} />
      <aside className="animate-slide-in absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-card shadow-2xl sm:w-[520px]">
        <div className="border-b border-line px-5 pb-5 pt-5 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-body">#{ticket.number ?? '—'}</span>
              {column && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-body">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: columnColor }} />
                  {columnLabel(column, role)}
                </span>
              )}
              {ticket.type && <TypeTag type={ticket.type} />}
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-paper hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2 className="mt-3 font-display text-[24px] font-bold leading-tight tracking-tight text-ink">{ticketTitle(ticket.description)}</h2>
          <p className="mt-1.5 text-sm text-muted">
            {[ticket.project, developer ? clientLabel : '', `Opened ${formatWhen(ticket.submitted)}`].filter(Boolean).join(' · ')}
          </p>

          {developer && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <TimeControl
                spent={ticket.timeSpent || 0}
                timerStarted={ticket.timerStarted}
                now={now}
                busy={timerBusy}
                withSteps
                size="md"
                onToggle={props.onToggleTimer}
                onAdjust={props.onAdjustTimer}
              />
              {recordUrl && (
                <a href={recordUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Softr
                </a>
              )}
            </div>
          )}
        </div>

        <div ref={thread} className="scroll-quiet flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
          <Message
            team={false}
            author={developer ? clientLabel : 'You'}
            badge="Request"
            when={ticket.submitted}
            text={ticket.description}
            attachments={ticket.attachments}
          />
          {ticket.response && <Message team author="Team" badge="Response" text={ticket.response} attachments={[]} />}
          {replies.map((reply) => {
            const team = reply.from !== 'Client';
            const author = team ? reply.author || 'Team' : developer ? reply.author || clientLabel : 'You';
            return (
              <Message
                key={reply.id}
                team={team}
                author={author}
                badge={team ? 'Team' : 'Client'}
                when={reply.posted}
                text={reply.message}
                attachments={reply.attachments}
              />
            );
          })}
          {replies.length === 0 && !ticket.response && (
            <p className="px-1 py-2 text-sm text-muted">
              {developer ? 'No replies yet.' : 'No replies yet. We’ll respond here, and you can add details any time.'}
            </p>
          )}

          {developer && (
            <section className="rounded-2xl border border-dashed border-line-strong p-4">
              <p className="eyebrow text-[10px] text-muted">Internal notes &middot; team only</p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => notes !== (ticket.internalNotes || '') && props.onSaveNotes(notes)}
                rows={3}
                placeholder="Notes clients never see"
                className="mt-2 w-full resize-y bg-transparent text-sm text-body placeholder:text-faint focus:outline-none"
              />
            </section>
          )}
        </div>

        <form onSubmit={send} className="border-t border-line bg-card px-4 pb-4 pt-3 sm:px-6">
          {files.length > 0 && (
            <div className="mb-3">
              <PendingFiles files={files} onRemove={removeFile} />
            </div>
          )}
          <div className="rounded-2xl border border-line bg-card transition focus-within:border-accent-fill focus-within:shadow-glow">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={(event) => {
                const pasted = filesFromClipboard(event);
                if (pasted.length && features.uploads) {
                  event.preventDefault();
                  void addFiles(pasted);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void send();
              }}
              rows={3}
              placeholder={developer ? `Reply to ${clientLabel}…` : 'Add a reply or more details…'}
              className="block w-full resize-none bg-transparent px-4 pt-3 text-[15px] text-ink placeholder:text-faint focus:outline-none"
              aria-label="Reply"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              {features.uploads ? <AttachButton onFiles={(list) => void addFiles(list)} disabled={sending} /> : <span />}
              <div className="flex items-center gap-3">
                <span className="hidden text-[11px] text-faint sm:inline">Ctrl + Enter to send</span>
                <button type="submit" disabled={!dirty || sending} className="btn-primary h-9 px-4 text-sm">
                  {sending ? 'Sending…' : 'Send'}
                  {!sending && <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </aside>
    </div>
  );
}
