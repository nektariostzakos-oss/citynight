// File-upload storage layout for owner-uploaded photos (Phase F1d-2).
//
// Files land at:   {UPLOADS_PATH}/venues/{venueId}/{uuid}.{ext}
// Served via:      GET /api/uploads/venues/{venueId}/{uuid}.{ext}
//   → resolved through pathFromUrl() with a strict prefix check so a
//   crafted "/api/uploads/../../etc/passwd" can't escape UPLOADS_PATH.
//
// UPLOADS_PATH defaults to "./uploads" for dev; on Hostinger it points at
// a persistent directory OUTSIDE the deploy path (§4 — same rule as
// DATABASE_PATH). Deploys never wipe it.

import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_PATH || './uploads');

// Allowed MIME → extension. We re-derive the extension from the MIME (not
// from the filename) so an attacker can't rename .exe → .jpg.
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

// Magic-byte signatures for the same three formats — checked AFTER reading
// the file so a wrong mime header can't sneak something through.
function detectKind(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  // WebP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp';
  return null;
}

export const MAX_BYTES = 5 * 1024 * 1024;     // 5 MB per file — generous for phone photos, blocks abuse
export const MAX_PHOTOS_PER_VENUE = 40;       // dashboard owner gallery cap (Places photos are separate)

export type SavedPhoto = {
  url: string;        // public URL — /api/uploads/...
  storageKey: string; // relative path inside UPLOADS_ROOT (for delete)
  ext: 'jpg' | 'png' | 'webp';
  bytes: number;
};

/**
 * Validate the upload and write it to disk. Returns the URL + key, or
 * throws a Response for the route handler to surface.
 */
export async function saveVenuePhoto(
  venueId: string,
  file: { mime: string; bytes: Buffer; size: number },
): Promise<SavedPhoto> {
  if (file.size > MAX_BYTES) {
    throw new Response('File too large', { status: 413 });
  }
  const declared = MIME_EXT[file.mime];
  if (!declared) {
    throw new Response('Unsupported image type', { status: 415 });
  }
  const detected = detectKind(file.bytes);
  if (!detected || (declared === 'jpg' ? 'jpg' : declared) !== detected) {
    // Mime says one thing, magic bytes say another — refuse.
    throw new Response('Image content does not match declared type', { status: 415 });
  }

  const relDir = path.posix.join('venues', venueId);
  const absDir = path.join(UPLOADS_ROOT, relDir);
  await fs.mkdir(absDir, { recursive: true });

  const fileName = `${randomUUID()}.${detected}`;
  const relPath = path.posix.join(relDir, fileName);
  const absPath = path.join(absDir, fileName);
  await fs.writeFile(absPath, file.bytes);

  return {
    url: `/api/uploads/${relPath}`,
    storageKey: relPath,
    ext: detected,
    bytes: file.size,
  };
}

/** Resolve a URL-supplied path to an absolute disk path, refusing anything
 *  that escapes UPLOADS_ROOT (path traversal defence). */
export function safeResolveInUploads(parts: readonly string[]): string | null {
  const joined = path.posix.join(...parts);
  const abs = path.resolve(UPLOADS_ROOT, joined);
  // The trailing separator handles the edge case where abs === UPLOADS_ROOT.
  if (abs !== UPLOADS_ROOT && !abs.startsWith(UPLOADS_ROOT + path.sep)) {
    return null;
  }
  return abs;
}

/** Best-effort delete; we don't fail the API call if the file is already
 *  gone (idempotent semantics for the dashboard delete button). */
export async function deleteUploadFile(relativeKey: string): Promise<void> {
  const abs = safeResolveInUploads([relativeKey]);
  if (!abs) return;
  try { await fs.unlink(abs); } catch { /* swallow ENOENT etc. */ }
}

export function mimeForExt(ext: string): string | null {
  switch (ext.toLowerCase()) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    default:     return null;
  }
}
