import type { ClipboardEvent } from 'react';
import type { PendingFile, UploadFile } from '../types';

export const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2200;
const SHRINK_ABOVE_BYTES = 1.2 * 1024 * 1024;

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Large photos and screenshots are scaled down to keep uploads fast and under the server limit. */
async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  const keep = { blob: file as Blob, name: file.name };
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return keep;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return keep; // Formats the browser can't decode (e.g. HEIC on some browsers) are sent as-is.
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SHRINK_ABOVE_BYTES) {
    bitmap.close();
    return keep;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return keep;
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size >= file.size) return keep;
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}

export async function prepareFiles(incoming: File[], existing: PendingFile[]): Promise<PendingFile[]> {
  const accepted = incoming.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
  if (accepted.length < incoming.length) throw new Error('Only images and PDFs can be attached.');
  if (existing.length + accepted.length > MAX_FILES) throw new Error(`You can attach up to ${MAX_FILES} files.`);

  const prepared = await Promise.all(
    accepted.map(async (file): Promise<PendingFile> => {
      const { blob, name } = file.type.startsWith('image/') ? await shrinkImage(file) : { blob: file as Blob, name: file.name };
      return {
        id: crypto.randomUUID(),
        filename: name || 'file',
        contentType: blob.type || file.type,
        size: blob.size,
        data: await readAsBase64(blob),
        preview: blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null,
      };
    })
  );

  const total = [...existing, ...prepared].reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    prepared.forEach(releasePreview);
    throw new Error('Those files are too large together. Try fewer or smaller files.');
  }
  return prepared;
}

export function releasePreview(file: PendingFile) {
  if (file.preview) URL.revokeObjectURL(file.preview);
}

export function toUpload(files: PendingFile[]): UploadFile[] {
  return files.map(({ filename, contentType, data }) => ({ filename, contentType, data }));
}

export function filesFromClipboard(event: ClipboardEvent): File[] {
  return Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
}
