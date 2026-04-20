/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generates PWA icons as PNG files using pure Node.js (no dependencies).
 * Creates 192x192 and 512x512 icons with the HustleBooks brand colors.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── Pixel drawing helpers ─────────────────────────────────────────────────────
function setPixel(pixels, size, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  pixels[idx]     = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

function fillRect(pixels, size, x0, y0, w, h, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(pixels, size, x, y, r, g, b, a);
    }
  }
}

/** Blend color onto existing pixel (alpha composite) */
function blendPixel(pixels, size, x, y, r, g, b, alpha) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  const a = alpha / 255;
  pixels[idx]     = Math.round(pixels[idx]     * (1 - a) + r * a);
  pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - a) + g * a);
  pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - a) + b * a);
  pixels[idx + 3] = 255;
}

/** Draw anti-aliased circle */
function drawCircle(pixels, size, cx, cy, radius, r, g, b, a = 255) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const alpha = Math.max(0, Math.min(1, radius + 0.5 - dist));
      if (alpha > 0) {
        blendPixel(pixels, size, x, y, r, g, b, Math.round(alpha * a));
      }
    }
  }
}

/**
 * Draw a scaled letter "H" using rectangles.
 * Parameters are in normalized 0..1 coordinates.
 */
function drawLetterH(pixels, size, cx, cy, scale, r, g, b) {
  const s = size * scale;
  const stemW = Math.round(s * 0.18);
  const height = Math.round(s * 0.55);
  const barH = Math.round(s * 0.14);

  const left  = Math.round(cx - s * 0.22);
  const right = Math.round(cx + s * 0.22 - stemW);
  const top   = Math.round(cy - height / 2);
  const barY  = Math.round(cy - barH / 2);

  // Left stem
  fillRect(pixels, size, left,  top, stemW, height, r, g, b);
  // Right stem
  fillRect(pixels, size, right, top, stemW, height, r, g, b);
  // Cross bar
  fillRect(pixels, size, left,  barY, right - left + stemW, barH, r, g, b);
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function createPNG(pixels, size) {
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter = None
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      raw.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw), { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
function renderIcon(size, maskable = false) {
  const pixels = new Uint8Array(size * size * 4);

  // Primary navy: #022448 = rgb(2, 36, 72)
  // Primary container: #1e3a5f = rgb(30, 58, 95)
  // Accent teal: #2ca6a4 = rgb(44, 166, 164)
  const navyR = 2, navyG = 36, navyB = 72;
  const deepR = 30, deepG = 58, deepB = 95;
  const tealR = 44, tealG = 166, tealB = 164;

  // Gradient background (top-left → bottom-right)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size); // 0..1 diagonal gradient
      const r = Math.round(navyR + (deepR - navyR) * t);
      const g = Math.round(navyG + (deepG - navyG) * t);
      const b = Math.round(navyB + (deepB - navyB) * t);
      const idx = (y * size + x) * 4;
      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }

  if (!maskable) {
    // Non-maskable: add rounded corners (circular mask)
    const cx = size / 2, cy = size / 2;
    const r = size * 0.5 - 1;
    // Clear pixels outside the circle (make transparent)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const alpha = Math.max(0, Math.min(1, r + 0.5 - dist));
        const idx = (y * size + x) * 4;
        pixels[idx + 3] = Math.round(alpha * 255);
      }
    }
  }

  // Teal accent circle (top-right decoration)
  const accentR = size * 0.72, accentC = size * 0.72, accentRadius = size * 0.18;
  drawCircle(pixels, size, accentC, accentR, accentRadius, tealR, tealG, tealB, 180);

  // Small teal dot bottom-left
  drawCircle(pixels, size, size * 0.28, size * 0.76, size * 0.06, tealR, tealG, tealB, 140);

  // White "H" monogram
  drawLetterH(pixels, size, size * 0.5, size * 0.5, 0.65, 255, 255, 255);

  return createPNG(pixels, size);
}

// ── Generate all icon sizes ───────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const icons = [
  { name: 'icon-192.png',           size: 192, maskable: false },
  { name: 'icon-512.png',           size: 512, maskable: false },
  { name: 'icon-maskable-192.png',  size: 192, maskable: true  },
  { name: 'icon-maskable-512.png',  size: 512, maskable: true  },
];

for (const { name, size, maskable } of icons) {
  const buf = renderIcon(size, maskable);
  const filePath = path.join(outDir, name);
  fs.writeFileSync(filePath, buf);
  console.log(`✓ Created ${filePath} (${buf.length} bytes)`);
}

// Apple Touch Icon (180x180, no transparency)
function renderAppleTouchIcon(size = 180) {
  const pixels = new Uint8Array(size * size * 4);
  const navyR = 2, navyG = 36, navyB = 72;
  const deepR = 30, deepG = 58, deepB = 95;
  const tealR = 44, tealG = 166, tealB = 164;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const r = Math.round(navyR + (deepR - navyR) * t);
      const g = Math.round(navyG + (deepG - navyG) * t);
      const b = Math.round(navyB + (deepB - navyB) * t);
      const idx = (y * size + x) * 4;
      pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = 255;
    }
  }
  drawCircle(pixels, size, size*0.72, size*0.72, size*0.18, tealR, tealG, tealB, 180);
  drawCircle(pixels, size, size*0.28, size*0.76, size*0.06, tealR, tealG, tealB, 140);
  drawLetterH(pixels, size, size*0.5, size*0.5, 0.65, 255, 255, 255);
  return createPNG(pixels, size);
}

const appleIconPath = path.join(outDir, 'apple-touch-icon.png');
fs.writeFileSync(appleIconPath, renderAppleTouchIcon(180));
console.log(`✓ Created ${appleIconPath}`);

console.log('\n✅ All PWA icons generated successfully!');
