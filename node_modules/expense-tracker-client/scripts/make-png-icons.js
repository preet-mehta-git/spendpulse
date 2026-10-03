import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate a solid/gradient PNG with pure Node.js (no native dependencies)
function createPngBuffer(width, height, bgColor = [9, 9, 11], fgColor = [16, 185, 129]) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.38;
  const innerRadius = width * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded app container & symbol
      const cornerRadius = width * 0.22;
      const inBox = Math.abs(dx) < (width / 2 - 8) && Math.abs(dy) < (height / 2 - 8);

      if (dist < radius && dist > innerRadius) {
        // Emerald circle ring
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else if (dist <= innerRadius * 0.7 && Math.abs(dx) < innerRadius * 0.15) {
        // Center vertical bar
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else if (dist <= innerRadius * 0.7 && Math.abs(dy + innerRadius * 0.25) < innerRadius * 0.12 && dx > -innerRadius * 0.35 && dx < innerRadius * 0.35) {
        // Center top bar
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else if (dist <= innerRadius * 0.7 && Math.abs(dy) < innerRadius * 0.12 && dx > -innerRadius * 0.35 && dx < innerRadius * 0.35) {
        // Center middle bar
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else {
        // Dark background
        rawData[pxOffset] = bgColor[0];
        rawData[pxOffset + 1] = bgColor[1];
        rawData[pxOffset + 2] = bgColor[2];
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type 6 (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, len + 8));
  chunk.writeInt32BE(crc, len + 8);
  return chunk;
}

// CRC32 table helper
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  }
  return ~c;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const publicDir = path.join(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192, 512x512, apple-touch-icon, and favicon
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPngBuffer(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPngBuffer(64, 64));

console.log('✅ Generated valid PNG icons for PWA: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico');
