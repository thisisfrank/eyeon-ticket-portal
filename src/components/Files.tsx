import { useRef, useState, type DragEvent } from 'react';
import { FileText, ImagePlus, Paperclip, X } from 'lucide-react';
import type { Attachment, PendingFile } from '../types';
import { formatBytes } from '../lib/format';
import { MAX_FILES } from '../lib/files';

const ACCEPT = 'image/*,application/pdf';

/** Compact "attach" button for the reply composer. */
export function AttachButton({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink disabled:opacity-40"
        title="Attach images or PDFs"
        aria-label="Attach files"
      >
        <Paperclip className="h-[18px] w-[18px]" />
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files || []));
          event.target.value = '';
        }}
      />
    </>
  );
}

/** Large drop target for the new-ticket form. */
export function Dropzone({ onFiles, disabled, count }: { onFiles: (files: File[]) => void; disabled?: boolean; count: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`flex items-center gap-4 rounded-2xl border border-dashed px-5 py-4 transition ${
        disabled
          ? 'cursor-not-allowed border-line opacity-60'
          : over
            ? 'cursor-copy border-accent-fill bg-accent-soft'
            : 'cursor-pointer border-line-strong bg-paper hover:border-accent-fill'
      }`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-accent shadow-card">
        <ImagePlus className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">Drop screenshots here</span>
        <span className="block text-sm text-muted">
          or click to choose. Images or PDFs, up to {MAX_FILES}
          {count > 0 ? ` (${count} added)` : ''}. You can also paste a screenshot.
        </span>
      </span>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files || []));
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function PendingFiles({ files, onRemove }: { files: PendingFile[]; onRemove: (id: string) => void }) {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.id} className="group relative">
          {file.preview ? (
            <img src={file.preview} alt={file.filename} className="h-16 w-16 rounded-xl border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-28 flex-col justify-center rounded-xl border border-line bg-paper px-2.5">
              <FileText className="h-4 w-4 text-muted" />
              <span className="mt-1 truncate text-[11px] text-body">{file.filename}</span>
            </span>
          )}
          <span className="sr-only">{formatBytes(file.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white shadow transition hover:bg-danger"
            aria-label={`Remove ${file.filename}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AttachmentList({ files, tone = 'light' }: { files: Attachment[]; tone?: 'light' | 'dark' }) {
  if (files.length === 0) return null;
  const images = files.filter((file) => file.type.startsWith('image/'));
  const others = files.filter((file) => !file.type.startsWith('image/'));
  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((file) => (
            <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl" title={file.filename}>
              <img
                src={file.thumb || file.url}
                alt={file.filename}
                loading="lazy"
                className={`aspect-[4/3] w-full object-cover transition group-hover:opacity-90 ${tone === 'dark' ? 'border border-night-line' : 'border border-line'}`}
              />
            </a>
          ))}
        </div>
      )}
      {others.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
            tone === 'dark' ? 'border-night-line text-white/80 hover:text-white' : 'border-line bg-card text-body hover:text-ink'
          }`}
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="truncate">{file.filename}</span>
          {file.size > 0 && <span className="ml-auto shrink-0 font-mono text-[11px] opacity-60">{formatBytes(file.size)}</span>}
        </a>
      ))}
    </div>
  );
}
