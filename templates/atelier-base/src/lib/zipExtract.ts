import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Minimal ZIP extractor for the customer template archive produced by
 * build-zip.py (Python `zipfile`: store or deflate, no encryption, no ZIP64 —
 * the archive is well under 4 GB). Dependency-free on purpose so a shipped
 * customer install can self-update without installing anything extra.
 */

const SIG_EOCD = 0x06054b50;
const SIG_CDIR = 0x02014b50;

type Entry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

/** Locate the end-of-central-directory record by scanning back from the tail. */
function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error("not a ZIP archive (no end-of-central-directory record)");
}

function readCentralDirectory(buf: Buffer): Entry[] {
  const eocd = findEocd(buf);
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== SIG_CDIR) {
      throw new Error("corrupt ZIP central directory");
    }
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.push({ name, method, compressedSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function entryData(buf: Buffer, e: Entry): Buffer {
  // Local file header: 30 fixed bytes, then the name + extra field, then data.
  const lh = e.localHeaderOffset;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const start = lh + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + e.compressedSize);
  if (e.method === 0) return Buffer.from(raw);
  if (e.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`unsupported ZIP compression method ${e.method}`);
}

/** Every entry must resolve inside destDir — rejects path-traversal archives. */
function safeJoin(destDir: string, name: string): string {
  const full = path.resolve(destDir, name);
  const rel = path.relative(destDir, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`unsafe path in archive: ${name}`);
  }
  return full;
}

/** Extract `zip` into `destDir`. Returns the number of files written. */
export async function extractZip(zip: Buffer, destDir: string): Promise<number> {
  const entries = readCentralDirectory(zip);
  let files = 0;
  for (const e of entries) {
    const dest = safeJoin(destDir, e.name);
    if (e.name.endsWith("/")) {
      await fs.mkdir(dest, { recursive: true });
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, entryData(zip, e));
    files++;
  }
  return files;
}
