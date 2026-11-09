// Renders the dartboard app icons as PNGs with no image library: each pixel is
// supersampled against the board geometry and encoded with zlib.
import { deflateSync, crc32 } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const COLORS = {
  black: [0x0b, 0x0b, 0x0c],
  cream: [0xf4, 0xef, 0xe1],
  red: [0xc1, 0x12, 0x1f],
  green: [0x0e, 0x7a, 0x3b],
  wire: [0x8d, 0x8f, 0x94],
};

// Ring radii relative to the outer edge of the double ring. Widened compared
// to a real board so the rings stay legible at launcher size.
const RINGS = { bull: 0.09, outerBull: 0.2, trebleIn: 0.52, trebleOut: 0.64, doubleIn: 0.86, wire: 1.06 };
const SEGMENT = (2 * Math.PI) / 20;
const SAMPLES = 4;

function boardColor(x, y) {
  const r = Math.hypot(x, y);
  if (r > RINGS.wire) return COLORS.black;
  if (r > 1) return r > RINGS.wire - 0.025 ? COLORS.wire : COLORS.black;
  if (r <= RINGS.bull) return COLORS.red;
  if (r <= RINGS.outerBull) return COLORS.green;
  const angle = (Math.atan2(x, -y) + SEGMENT / 2 + 2 * Math.PI) % (2 * Math.PI);
  const dark = Math.floor(angle / SEGMENT) % 2 === 0;
  const scoring = (r > RINGS.trebleIn && r <= RINGS.trebleOut) || r > RINGS.doubleIn;
  if (scoring) return dark ? COLORS.red : COLORS.green;
  return dark ? COLORS.black : COLORS.cream;
}

function render(size, boardRadius) {
  const rows = [];
  const center = size / 2;
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES - center) / boardRadius;
          const y = (py + (sy + 0.5) / SAMPLES - center) / boardRadius;
          boardColor(x, y).forEach((c, i) => { sum[i] += c; });
        }
      }
      sum.forEach((c, i) => { row[1 + px * 3 + i] = Math.round(c / SAMPLES ** 2); });
    }
    rows.push(row);
  }
  return encodePng(size, Buffer.concat(rows));
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../icons/', import.meta.url);
await mkdir(outDir, { recursive: true });
// [file, size, outer board radius in px]. Maskable icons must keep the board
// inside the 80% safe-zone circle.
const icons = [
  ['icon-192.png', 192, 192 * 0.44],
  ['icon-512.png', 512, 512 * 0.44],
  ['icon-maskable-512.png', 512, 512 * 0.38],
];
for (const [name, size, radius] of icons) {
  await writeFile(new URL(name, outDir), render(size, radius / RINGS.wire));
  console.log(`icons/${name}`);
}
