import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { api, errorMessage } from '../api';
import type { Features, PendingFile, Role, Ticket } from '../types';
import { TYPE_COLORS, TYPE_HINTS } from '../lib/board';
import { filesFromClipboard, prepareFiles, releasePreview, toUpload } from '../lib/files';
import { Eyebrow } from './Brand';
import { Dropzone, PendingFiles } from './Files';

interface Props {
  role: Role;
  types: string[];
  /** Most recent first. */
  projects: string[];
  clients: string[];
  features: Features;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

export function NewTicketModal({ role, types, projects, clients, features, onClose, onCreated }: Props) {
  const developer = role === 'developer';
  const [type, setType] = useState<string | null>(null);
  const [project, setProject] = useState(developer ? '' : projects[0] || '');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => () => filesRef.current.forEach(releasePreview), []);

  const dirty = description.trim().length > 0 || files.length > 0;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dirty && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, busy, onClose]);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (types.length > 0 && !type) return setError('Choose what kind of request this is.');
    if (!description.trim()) return setError('Describe what you need help with.');
    setBusy(true);
    setError('');
    try {
      const { ticket } = await api.createTicket({
        type,
        description: description.trim(),
        project: project.trim() || undefined,
        clientEmail: developer ? clientEmail.trim() || undefined : undefined,
        attachments: toUpload(files),
      });
      onCreated(ticket);
    } catch (submitError) {
      setError(errorMessage(submitError, 'Your ticket was not submitted.'));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title">
      <form
        onSubmit={submit}
        className="animate-rise scroll-quiet max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:max-w-[640px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-9 sm:pt-8">
          <div>
            <Eyebrow>New ticket</Eyebrow>
            <h2 id="new-ticket-title" className="display mt-2 text-[32px] leading-none sm:text-[38px]">
              What do you need?
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-paper hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-9">
          {types.length > 0 && (
            <fieldset>
              <legend className="mb-2.5 text-sm font-medium text-ink">Type of request</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {types.map((option) => {
                  const active = type === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setType(option)}
                      aria-pressed={active}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        active ? 'border-accent-fill bg-accent-soft shadow-glow' : 'border-line bg-card hover:border-line-strong'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[option] || '#9b9b95' }} />
                        {option}
                      </span>
                      {TYPE_HINTS[option] && <span className="mt-1 block text-[13px] leading-snug text-muted">{TYPE_HINTS[option]}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {developer ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Client email</span>
                <input list="portal-clients" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="field h-11" placeholder="Optional" />
                <datalist id="portal-clients">
                  {clients.map((email) => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Project</span>
                <input list="portal-projects" value={project} onChange={(event) => setProject(event.target.value)} className="field h-11" placeholder="Defaults to the client’s latest" />
                <datalist id="portal-projects">
                  {projects.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            </div>
          ) : (
            projects.length > 1 && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Project</span>
                <select value={project} onChange={(event) => setProject(event.target.value)} className="field select-chevron h-11">
                  {projects.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Details</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onPaste={(event) => {
                const pasted = filesFromClipboard(event);
                if (pasted.length && features.uploads) {
                  event.preventDefault();
                  void addFiles(pasted);
                }
              }}
              rows={6}
              autoFocus
              placeholder="What’s happening, where, and what you expected instead. The more detail, the faster we can help."
              className="field resize-y py-3 leading-relaxed"
            />
          </label>

          {features.uploads && (
            <div className="space-y-3">
              <Dropzone onFiles={(list) => void addFiles(list)} disabled={busy} count={files.length} />
              <PendingFiles files={files} onRemove={removeFile} />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-card px-6 py-4 sm:px-9">
          <button type="button" onClick={onClose} disabled={busy} className="btn-quiet h-11 px-5 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary h-11 px-6 text-[15px]">
            {busy ? 'Submitting…' : 'Submit ticket'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
