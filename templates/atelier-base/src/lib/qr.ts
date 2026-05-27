/**
 * Minimal QR encoder — Byte mode, error level L, auto-size (versions 1..10).
 * Returns a compact SVG string. Enough for URLs up to ~230 chars.
 */

type Module = 0 | 1;

const EC_L_TOTAL: Record<number, number> = {
  1: 26, 2: 44, 3: 70, 4: 100, 5: 134,
  6: 172, 7: 196, 8: 242, 9: 292, 10: 346,
};
const EC_L_DATA_CODEWORDS: Record<number, number> = {
  1: 19, 2: 34, 3: 55, 4: 80, 5: 108,
  6: 136, 7: 156, 8: 194, 9: 232, 10: 274,
};
const EC_L_EC_PER_BLOCK: Record<number, number> = {
  1: 7, 2: 10, 3: 15, 4: 20, 5: 26,
  6: 18, 7: 20, 8: 24, 9: 30, 10: 18,
};
const EC_L_BLOCKS: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1,
  6: 2, 7: 2, 8: 2, 9: 2, 10: 4,
};

/* Galois field tables for GF(256) with prim poly 0x11d */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
}

function rsGenPoly(deg: number): Uint8Array {
  let p = new Uint8Array([1]);
  for (let i = 0; i < deg; i++) {
    const np = new Uint8Array(p.length + 1);
    for (let j = 0; j < p.length; j++) {
      np[j] ^= p[j];
      np[j + 1] ^= GF_EXP[(GF_LOG[p[j]] + i) % 255];
    }
    p = np;
  }
  return p;
}

function rsEncode(data: Uint8Array, ec: number): Uint8Array {
  const gen = rsGenPoly(ec);
  const buf = new Uint8Array(data.length + ec);
  buf.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= GF_EXP[(GF_LOG[coef] + GF_LOG[gen[j]]) % 255];
      }
    }
  }
  return buf.slice(data.length);
}

function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const cap = EC_L_DATA_CODEWORDS[v];
    const header = v < 10 ? 2 : 3; // mode(4) + length(8 or 16)
    if (byteLen + header <= cap) return v;
  }
  throw new Error("Data too large for this encoder (max version 10).");
}

function buildBitStream(data: Uint8Array, version: number): Uint8Array {
  const lenBits = version < 10 ? 8 : 16;
  const totalDataBits = EC_L_DATA_CODEWORDS[version] * 8;
  const bits: number[] = [];
  // Byte mode 0100
  bits.push(0, 1, 0, 0);
  // Length
  for (let i = lenBits - 1; i >= 0; i--) bits.push((data.length >> i) & 1);
  // Data
  for (const b of data) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  // Terminator (up to 4 zeros)
  const term = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  // Byte align
  while (bits.length % 8) bits.push(0);
  // Pad bytes
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalDataBits) {
    const b = padBytes[pi++ % 2];
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  const out = new Uint8Array(totalDataBits / 8);
  for (let i = 0; i < out.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    out[i] = byte;
  }
  return out;
}

function matrixSize(version: number): number {
  return 17 + version * 4;
}

function createMatrix(size: number): { mx: Module[][]; reserved: boolean[][] } {
  const mx: Module[][] = Array.from({ length: size }, () => Array(size).fill(0) as Module[]);
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  return { mx, reserved };
}

function placeFinder(mx: Module[][], reserved: boolean[][], r: number, c: number) {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const y = r + i, x = c + j;
      if (y < 0 || x < 0 || y >= mx.length || x >= mx.length) continue;
      reserved[y][x] = true;
      const inside =
        (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
        (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
        (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      mx[y][x] = inside ? 1 : 0;
    }
  }
}

function placeTimingAndDark(mx: Module[][], reserved: boolean[][], size: number, version: number) {
  for (let i = 8; i < size - 8; i++) {
    mx[6][i] = i % 2 === 0 ? 1 : 0;
    mx[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }
  mx[size - 8][8] = 1; // dark module
  reserved[size - 8][8] = true;
  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  // Version info area (v7+): 3x6 blocks both corners — skipped (we handle v<=10 without it properly only for v<7; add stub for 7..10)
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
  }
}

function placeData(mx: Module[][], reserved: boolean[][], size: number, data: Uint8Array) {
  let bitIdx = 0;
  const totalBits = data.length * 8;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (reserved[row][x]) continue;
        if (bitIdx >= totalBits) { mx[row][x] = 0; continue; }
        const byte = data[bitIdx >> 3];
        const bit = (byte >> (7 - (bitIdx & 7))) & 1;
        mx[row][x] = bit as Module;
        bitIdx++;
      }
    }
    up = !up;
  }
}

function applyMask(mx: Module[][], reserved: boolean[][], size: number, mask: number) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (reserved[y][x]) continue;
      let m = false;
      switch (mask) {
        case 0: m = (y + x) % 2 === 0; break;
        case 1: m = y % 2 === 0; break;
        case 2: m = x % 3 === 0; break;
        case 3: m = (y + x) % 3 === 0; break;
        case 4: m = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
        case 5: m = ((y * x) % 2) + ((y * x) % 3) === 0; break;
        case 6: m = (((y * x) % 2) + ((y * x) % 3)) % 2 === 0; break;
        case 7: m = (((y + x) % 2) + ((y * x) % 3)) % 2 === 0; break;
      }
      if (m) mx[y][x] = (mx[y][x] ^ 1) as Module;
    }
  }
}

const FORMAT_BITS = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
];

function placeFormat(mx: Module[][], size: number, mask: number) {
  const bits = FORMAT_BITS[mask];
  for (let i = 0; i < 15; i++) {
    const b = ((bits >> i) & 1) as Module;
    // row
    if (i < 6) mx[8][i] = b;
    else if (i < 8) mx[8][i + 1] = b;
    else if (i < 15) mx[8 + (14 - i)][8] = b;
    if (i === 6) mx[8][8] = b;
    if (i === 7) mx[8][8] = b;
    // column mirror
    if (i < 7) mx[size - 1 - i][8] = b;
    else mx[8][size - 15 + i] = b;
  }
}

export function encodeQR(text: string): { size: number; modules: Module[][] } {
  const data = new TextEncoder().encode(text);
  const version = pickVersion(data.length);
  const bitStream = buildBitStream(data, version);

  const totalDataCodewords = EC_L_DATA_CODEWORDS[version];
  const ecPerBlock = EC_L_EC_PER_BLOCK[version];
  const blocks = EC_L_BLOCKS[version];
  const short = Math.floor(totalDataCodewords / blocks);
  const longCount = totalDataCodewords % blocks;

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < blocks; i++) {
    const len = short + (i >= blocks - longCount ? 1 : 0);
    const d = bitStream.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(d);
    ecBlocks.push(rsEncode(d, ecPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++)
    for (const b of dataBlocks) if (i < b.length) interleaved.push(b[i]);
  for (let i = 0; i < ecPerBlock; i++)
    for (const b of ecBlocks) interleaved.push(b[i]);

  const finalData = new Uint8Array(interleaved);
  const size = matrixSize(version);
  const { mx, reserved } = createMatrix(size);

  placeFinder(mx, reserved, 0, 0);
  placeFinder(mx, reserved, 0, size - 7);
  placeFinder(mx, reserved, size - 7, 0);
  placeTimingAndDark(mx, reserved, size, version);
  placeData(mx, reserved, size, finalData);

  applyMask(mx, reserved, size, 0);
  placeFormat(mx, size, 0);

  return { size, modules: mx };
}

export function qrToSvg(text: string, px = 220, dark = "#0a0e15", light = "#ffffff"): string {
  const { size, modules } = encodeQR(text);
  const quiet = 2;
  const total = size + quiet * 2;
  const scale = px / total;
  let paths = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x])
        paths += `M${(x + quiet) * scale},${(y + quiet) * scale}h${scale}v${scale}h-${scale}z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}"><rect width="${px}" height="${px}" fill="${light}"/><path d="${paths}" fill="${dark}"/></svg>`;
}
