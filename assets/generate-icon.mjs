/**
 * generate-icon.mjs
 * Creates assets/icon.ico (multi-size: 16, 32, 48, 64, 128, 256) from logo.svg
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * An ICO file is a container of PNGs (or BMPs). We embed raw solid-color PNGs
 * for each size as a valid minimal ICO. The actual design will be improved when
 * a designer provides a proper icon asset.
 *
 * For the release build, electron-builder will use this icon.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../assets');
const ICO_PATH = path.join(ASSETS_DIR, 'icon.ico');

// Ensure assets dir exists
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// ── Minimal PNG builder ───────────────────────────────────────────────────────
// Creates a valid 32-bit PNG from raw RGBA pixel data

function adler32(data) {
  let s1 = 1, s2 = 0;
  for (const b of data) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  return (s2 << 16) | s1;
}

function crc32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const b of data) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function deflateRaw(data) {
  // Minimal zlib block (uncompressed / stored)
  const output = [];
  // zlib header: CMF=0x78 (deflate, window size 32k), FLG=0x9C
  output.push(0x78, 0x9C);
  let offset = 0;
  while (offset < data.length) {
    const blockSize = Math.min(65535, data.length - offset);
    const last = (offset + blockSize >= data.length) ? 1 : 0;
    output.push(last); // BFINAL | BTYPE=00
    output.push(blockSize & 0xFF, (blockSize >> 8) & 0xFF); // LEN
    output.push((~blockSize) & 0xFF, ((~blockSize) >> 8) & 0xFF); // NLEN
    for (let i = 0; i < blockSize; i++) output.push(data[offset + i]);
    offset += blockSize;
  }
  const adler = adler32(data);
  output.push((adler >> 24) & 0xFF, (adler >> 16) & 0xFF, (adler >> 8) & 0xFF, adler & 0xFF);
  return Buffer.from(output);
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = crc32(Buffer.concat([typeBytes, data]));
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function makePng(size, rgba) {
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (we'll strip alpha for ICO)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data with filter bytes
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(0); // filter type None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rawRows.push(rgba[i], rgba[i + 1], rgba[i + 2]); // RGB only
    }
  }

  // IDAT
  const raw = Buffer.from(rawRows);
  const compressed = deflateRaw(raw);
  const idat = compressed;

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon design: Logisim Pro chip logo ───────────────────────────────────────
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Background gradient: dark navy (#0f172a → #1e293b)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / size;
      const r = Math.round(15 + t * (30 - 15));
      const g = Math.round(23 + t * (41 - 23));
      const b = Math.round(42 + t * (59 - 42));

      const idx = (y * size + x) * 4;

      // Rounded corners mask
      const cx = size / 2, cy = size / 2;
      const radius = size * 0.22;
      const dx = x - cx, dy = y - cy;
      const hsize = size / 2;
      // Superellipse check for rounded rect
      const rx = hsize * 0.9, ry = hsize * 0.9;
      const cornR = size * 0.22;
      // Check if inside rounded rectangle
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const inRect = ax <= rx && ay <= ry;
      const inCorner = ax > rx - cornR || ay > ry - cornR
        ? Math.hypot(ax - (rx - cornR), ay - (ry - cornR)) <= cornR
        : true;

      if (!inRect || !inCorner) {
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
        continue;
      }

      pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = 255;
    }
  }

  // Draw circuit chip frame — cyan/blue border rect
  const margin = Math.round(size * 0.3);
  const chipW = size - margin * 2;
  const chipH = size - margin * 2;
  const borderW = Math.max(1, Math.round(size * 0.025));
  const chipR = Math.round(size * 0.06);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (pixels[idx + 3] === 0) continue;

      const lx = x - margin, ly = y - margin;
      if (lx < 0 || lx >= chipW || ly < 0 || ly >= chipH) continue;

      // Chip border (rounded rect stroke)
      const onBorderL = lx < borderW;
      const onBorderR = lx >= chipW - borderW;
      const onBorderT = ly < borderW;
      const onBorderB = ly >= chipH - borderW;
      if (onBorderL || onBorderR || onBorderT || onBorderB) {
        // Cyan-to-blue gradient
        const t2 = (x + y) / (size * 2);
        pixels[idx] = Math.round(6 + t2 * (59 - 6));
        pixels[idx+1] = Math.round(182 + t2 * (130 - 182));
        pixels[idx+2] = Math.round(212 + t2 * (246 - 212));
        pixels[idx+3] = 255;
      }

      // AND gate symbol inside chip — simplified as ">" arrow shape
      const cx2 = size * 0.5, cy2 = size * 0.5;
      const gw = chipW * 0.35, gh = chipH * 0.45;
      const gx = cx2 - gw / 2, gy = cy2 - gh / 2;
      const rx2 = x - gx, ry2 = y - gy;
      if (rx2 >= 0 && rx2 <= gw && ry2 >= 0 && ry2 <= gh) {
        // Left flat side
        if (rx2 < borderW * 1.5 ||
          // Top horizontal
          (ry2 < borderW * 1.5 && rx2 < gw * 0.55) ||
          // Bottom horizontal
          (ry2 > gh - borderW * 1.5 && rx2 < gw * 0.55)) {
          pixels[idx] = 245; pixels[idx+1] = 158; pixels[idx+2] = 11; pixels[idx+3] = 255;
        }
        // Curved right side: simplified as diagonal
        const halfH = gh / 2;
        const normalizedY = Math.abs(ry2 - halfH) / halfH;
        const curveX = gw * (0.55 + 0.45 * (1 - normalizedY * normalizedY));
        if (Math.abs(rx2 - curveX) < borderW * 1.5) {
          pixels[idx] = 245; pixels[idx+1] = 158; pixels[idx+2] = 11; pixels[idx+3] = 255;
        }
      }
    }
  }

  // Draw wire traces on left and right of chip
  const wireY = [
    Math.round(size * 0.31),
    Math.round(size * 0.50),
    Math.round(size * 0.69),
  ];
  const wireW = Math.max(1, Math.round(size * 0.03));

  for (const wy of wireY) {
    // Left wires (cyan)
    for (let x = Math.round(size * 0.08); x < margin; x++) {
      for (let dy2 = -wireW; dy2 <= wireW; dy2++) {
        const py = wy + dy2;
        if (py < 0 || py >= size) continue;
        const idx = (py * size + x) * 4;
        if (pixels[idx+3] === 0) continue;
        pixels[idx] = 6; pixels[idx+1] = 182; pixels[idx+2] = 212; pixels[idx+3] = 200;
      }
    }
    // Right wires (blue)
    for (let x = size - margin; x < Math.round(size * 0.92); x++) {
      for (let dy2 = -wireW; dy2 <= wireW; dy2++) {
        const py = wy + dy2;
        if (py < 0 || py >= size) continue;
        const idx = (py * size + x) * 4;
        if (pixels[idx+3] === 0) continue;
        pixels[idx] = 59; pixels[idx+1] = 130; pixels[idx+2] = 246; pixels[idx+3] = 200;
      }
    }
  }

  // Center green pulse dot
  const dotR = Math.max(2, Math.round(size * 0.055));
  const dotCx = Math.round(size * 0.5), dotCy = Math.round(size * 0.5);
  for (let y = dotCy - dotR; y <= dotCy + dotR; y++) {
    for (let x = dotCx - dotR; x <= dotCx + dotR; x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      if (Math.hypot(x - dotCx, y - dotCy) <= dotR) {
        const idx = (y * size + x) * 4;
        pixels[idx] = 16; pixels[idx+1] = 185; pixels[idx+2] = 129; pixels[idx+3] = 255;
      }
    }
  }

  return makePng(size, pixels);
}

// ── Assemble ICO file ─────────────────────────────────────────────────────────
const SIZES = [16, 32, 48, 64, 128, 256];

console.log('Generating icon sizes:', SIZES.join(', '));
const pngs = SIZES.map(s => {
  process.stdout.write(`  Rendering ${s}x${s}... `);
  const p = drawIcon(s);
  console.log(`${p.length} bytes`);
  return p;
});

// ICO header
const numImages = SIZES.length;
const headerSize = 6;
const dirSize = 16 * numImages;
let offset = headerSize + dirSize;

const header = Buffer.allocUnsafe(6);
header.writeUInt16LE(0, 0);  // Reserved
header.writeUInt16LE(1, 2);  // Type: ICO
header.writeUInt16LE(numImages, 4);

const directories = [];
const pngData = [];

for (let i = 0; i < SIZES.length; i++) {
  const size = SIZES[i];
  const png = pngs[i];
  const dir = Buffer.allocUnsafe(16);
  dir[0] = size >= 256 ? 0 : size;  // Width (0 = 256)
  dir[1] = size >= 256 ? 0 : size;  // Height (0 = 256)
  dir[2] = 0;   // Color count
  dir[3] = 0;   // Reserved
  dir.writeUInt16LE(1, 4);   // Color planes
  dir.writeUInt16LE(32, 6);  // Bits per pixel
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(offset, 12);
  directories.push(dir);
  pngData.push(png);
  offset += png.length;
}

const icoBuffer = Buffer.concat([header, ...directories, ...pngData]);
fs.writeFileSync(ICO_PATH, icoBuffer);

console.log(`\n✅ Icon generated: ${ICO_PATH} (${(icoBuffer.length / 1024).toFixed(1)} KB)`);
console.log('   Sizes:', SIZES.join(', '));
