/**
 * Minimal QR encoder (byte mode, error-correction level M, versions 1-10),
 * dependency-free.
 *
 * The only payload it has to carry is the short receipt verification link, so
 * the table stops at version 10 (up to 213 bytes at level M).
 */

interface VersionSpec {
  totalCodewords: number;
  eccPerBlock: number;
  /** Data blocks per group: `[group1Blocks, group2Blocks?]`. */
  groups: [number, number?];
}

// Level-M capacity tables for versions 1-10 (ECC per block and block layout).
const VERSIONS_M: VersionSpec[] = [
  { totalCodewords: 26, eccPerBlock: 10, groups: [1] },
  { totalCodewords: 44, eccPerBlock: 16, groups: [1] },
  { totalCodewords: 70, eccPerBlock: 26, groups: [1] },
  { totalCodewords: 100, eccPerBlock: 18, groups: [2] },
  { totalCodewords: 134, eccPerBlock: 24, groups: [2] },
  { totalCodewords: 172, eccPerBlock: 16, groups: [4] },
  { totalCodewords: 196, eccPerBlock: 18, groups: [4] },
  { totalCodewords: 242, eccPerBlock: 22, groups: [2, 2] },
  { totalCodewords: 292, eccPerBlock: 22, groups: [3, 2] },
  { totalCodewords: 346, eccPerBlock: 26, groups: [4, 1] },
];

const MAX_VERSION = VERSIONS_M.length;

function totalBlocks(spec: VersionSpec): number {
  return spec.groups[0] + (spec.groups[1] ?? 0);
}

function dataCodewords(spec: VersionSpec): number {
  return spec.totalCodewords - spec.eccPerBlock * totalBlocks(spec);
}

// --- Galois field GF(256) helpers for Reed-Solomon -------------------------
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: number[], degree: number): number[] {
  const generator = rsGenerator(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) remainder[i] ^= gfMul(generator[i + 1], factor);
  }
  return remainder;
}

function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

// --- Bit stream + codewords ------------------------------------------------
class BitBuffer {
  readonly bits: number[] = [];
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }
}

function buildCodewords(version: number, text: string): number[] {
  const spec = VERSIONS_M[version - 1];
  const bytes = utf8Bytes(text);
  const bits = new BitBuffer();
  bits.put(4, 4); // byte mode
  bits.put(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) bits.put(byte, 8);

  const capacityBits = dataCodewords(spec) * 8;
  if (bits.bits.length > capacityBits) throw new Error('QR payload too long.');
  bits.put(0, Math.min(4, capacityBits - bits.bits.length));
  while (bits.bits.length % 8 !== 0) bits.bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits.bits[i + j];
    codewords.push(value);
  }
  const padBytes = [0xec, 0x11];
  while (codewords.length < dataCodewords(spec)) codewords.push(padBytes[codewords.length % 2]);

  const blocks = splitIntoBlocks(version, codewords);
  const eccBlocks = blocks.map((block) => rsRemainder(block, spec.eccPerBlock));

  const interleaved: number[] = [];
  const longest = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < longest; i += 1) {
    for (const block of blocks) if (i < block.length) interleaved.push(block[i]);
  }
  for (let i = 0; i < spec.eccPerBlock; i += 1) {
    for (const block of eccBlocks) interleaved.push(block[i]);
  }
  return interleaved;
}

/** Split data codewords into blocks; the second group's blocks hold one byte more. */
export function splitIntoBlocks(version: number, codewords: number[]): number[][] {
  const spec = VERSIONS_M[version - 1];
  const count = totalBlocks(spec);
  const shortLength = Math.floor(codewords.length / count);
  const longBlocks = codewords.length % count;
  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < count; i += 1) {
    const length = shortLength + (i >= count - longBlocks ? 1 : 0);
    blocks.push(codewords.slice(offset, offset + length));
    offset += length;
  }
  return blocks;
}

// --- Matrix construction ---------------------------------------------------
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((size - 13) / (count - 1) / 2) * 2;
  const positions = [size - 7];
  for (let i = 1; i < count - 1; i += 1) positions.unshift(size - 7 - i * step);
  positions.unshift(6);
  return positions;
}

export function formatInfoBits(mask: number): number {
  const data = mask; // error-correction level M is 00
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function versionInfoBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

export function maskApplies(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

export interface QrMatrix {
  version: number;
  size: number;
  /** `modules[y][x]`, true = dark. */
  modules: boolean[][];
}

export function encodeQr(text: string): QrMatrix {
  const byteLength = utf8Bytes(text).length;
  let version = 0;
  for (let v = 1; v <= MAX_VERSION; v += 1) {
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    if (headerBits + byteLength * 8 <= dataCodewords(VERSIONS_M[v - 1]) * 8) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error('QR payload too long for the built-in encoder.');

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const set = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  // Finder patterns (with their light separators).
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  }

  // Timing patterns.
  for (let i = 8; i < size - 8; i += 1) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }

  // Alignment patterns.
  const align = alignmentPositions(version);
  for (const ay of align) {
    for (const ax of align) {
      const corner =
        (ax === 6 && ay === 6) ||
        (ax === 6 && ay === size - 7) ||
        (ax === size - 7 && ay === 6);
      if (corner) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Format-information areas are reserved now, filled after masking.
  for (let i = 0; i < 9; i += 1) {
    if (!reserved[8][i]) set(i, 8, false);
    if (!reserved[i][8]) set(8, i, false);
  }
  for (let i = 0; i < 8; i += 1) {
    if (!reserved[size - 1 - i][8]) set(8, size - 1 - i, false);
    if (!reserved[8][size - 1 - i]) set(size - 1 - i, 8, false);
  }
  set(8, size - 8, true); // dark module

  if (version >= 7) {
    const bits = versionInfoBits(version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // Data: two-column zig-zag from the bottom-right, skipping the timing column.
  const codewords = buildCodewords(version, text);
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      const y = upward ? size - 1 - step : step;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (reserved[y][x]) continue;
        const dark =
          bitIndex < codewords.length * 8
            ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1
            : false;
        modules[y][x] = dark;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reserved[y][x] && maskApplies(mask, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  const writeFormat = (mask: number) => {
    const bits = formatInfoBits(mask);
    for (let i = 0; i <= 5; i += 1) set(8, i, ((bits >>> i) & 1) === 1);
    set(8, 7, ((bits >>> 6) & 1) === 1);
    set(8, 8, ((bits >>> 7) & 1) === 1);
    set(7, 8, ((bits >>> 8) & 1) === 1);
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, ((bits >>> i) & 1) === 1);
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, ((bits >>> i) & 1) === 1);
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, ((bits >>> i) & 1) === 1);
    set(8, size - 8, true);
  };

  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask);
    writeFormat(mask);
    const score = penaltyScore(modules, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(mask); // revert before trying the next mask
  }
  applyMask(bestMask);
  writeFormat(bestMask);

  return { version, size, modules };
}

/** Standard mask-evaluation penalties (run length, 2x2 blocks, balance). */
function penaltyScore(modules: boolean[][], size: number): number {
  let score = 0;
  const scan = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i < size; i += 1) {
      if (get(i) === get(i - 1)) {
        run += 1;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  };
  for (let y = 0; y < size; y += 1) scan((i) => modules[y][i]);
  for (let x = 0; x < size; x += 1) scan((i) => modules[i][x]);

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const value = modules[y][x];
      if (value === modules[y][x + 1] && value === modules[y + 1][x] && value === modules[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  let dark = 0;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (modules[y][x]) dark += 1;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}
