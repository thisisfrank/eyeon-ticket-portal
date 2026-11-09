import { del, put } from '@vercel/blob';
import { HttpError } from './http.js';
import { SOFTR_FILE_ORIGIN, writeWithShapes } from './softr.js';

// Softr's API has no upload endpoint; attachment fields take a public URL.
// Files are put in Vercel Blob first, handed to Softr by URL, and removed
// from Blob again once Softr has made its own copy.

const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 3.3 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB, base64 adds ~33%

function safeName(name) {
  const cleaned = String(name || 'file')
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned.slice(-80) || 'file';
}

/** @returns {Promise<{ url: string, filename: string }[]>} */
export async function uploadFiles(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new HttpError(400, 'Attachments are not set up on this server yet. Send it without files for now.');
  }
  if (list.length > MAX_FILES) throw new HttpError(400, `Attach up to ${MAX_FILES} files at a time.`);

  const decoded = list.map((file) => {
    const contentType = String(file?.contentType || '');
    if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
      throw new HttpError(400, 'Only images and PDFs can be attached.');
    }
    const buffer = Buffer.from(String(file?.data || ''), 'base64');
    if (buffer.length === 0) throw new HttpError(400, `${file?.filename || 'A file'} is empty.`);
    return { buffer, contentType, filename: safeName(file.filename) };
  });
  const total = decoded.reduce((sum, file) => sum + file.buffer.length, 0);
  if (total > MAX_TOTAL_BYTES) throw new HttpError(413, 'Those files are too large together. Try fewer or smaller images.');

  return Promise.all(
    decoded.map(async (file) => {
      const blob = await put(`portal-uploads/${file.filename}`, file.buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.contentType,
      });
      return { url: blob.url, filename: file.filename };
    })
  );
}

/** Attachment value shapes to try, most likely first. */
export function attachmentShapes(files) {
  return [
    files.map((file) => ({ url: file.url, filename: file.filename })),
    files.map((file) => ({ url: file.url })),
  ];
}

/**
 * Saves a record that carries attachments. `save(attachmentValue)` performs the
 * Softr write; the right attachment shape is found automatically. Callers
 * should call discardUploads() if the save ultimately fails.
 */
export function saveWithFiles(key, files, save) {
  if (files.length === 0) return save(undefined);
  return writeWithShapes(`${key}:attachments`, attachmentShapes(files), save);
}

/** Remove the Blob copies once Softr is serving its own copies of every file. */
export async function releaseUploads(files, savedAttachmentValue) {
  if (files.length === 0) return;
  const saved = Array.isArray(savedAttachmentValue) ? savedAttachmentValue : [];
  const copied = saved.length >= files.length && saved.every((file) => String(file?.url || '').startsWith(SOFTR_FILE_ORIGIN));
  if (copied) await discardUploads(files);
}

export async function discardUploads(files) {
  if (files.length === 0) return;
  try {
    await del(files.map((file) => file.url));
  } catch (error) {
    console.error('Could not remove temporary uploads', error);
  }
}
