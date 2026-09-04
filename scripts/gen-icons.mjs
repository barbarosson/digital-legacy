/**
 * Generates all icon assets from a single SVG source:
 *   public/icon.svg           — source
 *   public/favicon.ico        — 16 + 32 + 48 px multi-size ICO
 *   public/icon-256.png       — 256 px PNG (Electron tray / taskbar)
 *   public/icon-512.png       — 512 px PNG
 *   build/icon.ico            — multi-size ICO used by electron-builder
 *   build/icon.png            — 512 px used by electron-builder Linux
 *   build/icons/              — 16, 32, 48, 64, 128, 256, 512 PNG set
 *   build/StoreLogo.png       — 50 × 50 (MSIX)
 *   build/Square44x44Logo.png — 44 × 44 (MSIX)
 *   build/Square150x150Logo.png — 150 × 150 (MSIX)
 *   build/Wide310x150Logo.png   — 310 × 150 (MSIX)
 *   public/store-listing-300.png — 300 × 300 (Partner Center listing)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgSrc = path.join(root, "public", "icon.svg");

if (!fs.existsSync(svgSrc)) {
  console.error("public/icon.svg not found — run after placing the SVG.");
  process.exit(1);
}

const build = path.join(root, "build");
const buildIcons = path.join(build, "icons");
for (const dir of [build, buildIcons]) {
  fs.mkdirSync(dir, { recursive: true });
}

const svg = fs.readFileSync(svgSrc);

async function png(size, dest) {
  await sharp(svg).resize(size, size).png().toFile(dest);
  console.log("  ✓", path.relative(root, dest));
}

async function wide(w, h, dest) {
  // Place a square version centred on a transparent canvas
  const sq = Math.min(w, h);
  const inner = await sharp(svg).resize(sq, sq).png().toBuffer();
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toFile(dest);
  console.log("  ✓", path.relative(root, dest));
}

async function ico(sizes, dest) {
  // Build a naive ICO by concatenating BITMAPINFOHEADER PNGs.
  // Modern Windows and Electron accept PNG-in-ICO.
  const entries = await Promise.all(
    sizes.map(async (s) => {
      const buf = await sharp(svg).resize(s, s).png().toBuffer();
      return { size: s, buf };
    }),
  );

  const count = entries.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(count, 4);

  const images = [];
  for (let i = 0; i < count; i++) {
    const { size, buf } = entries[i];
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    header.writeUInt8(w, 6 + i * 16);
    header.writeUInt8(h, 7 + i * 16);
    header.writeUInt8(0, 8 + i * 16); // color count
    header.writeUInt8(0, 9 + i * 16); // reserved
    header.writeUInt16LE(1, 10 + i * 16); // planes
    header.writeUInt16LE(32, 12 + i * 16); // bit count
    header.writeUInt32LE(buf.length, 14 + i * 16);
    header.writeUInt32LE(offset, 18 + i * 16);
    offset += buf.length;
    images.push(buf);
  }

  fs.writeFileSync(dest, Buffer.concat([header, ...images]));
  console.log("  ✓", path.relative(root, dest));
}

console.log("Generating icons from public/icon.svg …");

await Promise.all([
  // PNG set for build/icons/
  ...[16, 32, 48, 64, 128, 256, 512].map((s) =>
    png(s, path.join(buildIcons, `${s}x${s}.png`)),
  ),
  // Electron-builder expects build/icon.png (512) and build/icon.ico
  png(512, path.join(build, "icon.png")),
  // Public PNGs
  png(256, path.join(root, "public", "icon-256.png")),
  png(512, path.join(root, "public", "icon-512.png")),
  // MSIX tile assets
  png(50, path.join(build, "StoreLogo.png")),
  png(44, path.join(build, "Square44x44Logo.png")),
  png(150, path.join(build, "Square150x150Logo.png")),
  png(300, path.join(root, "public", "store-listing-300.png")),
  wide(310, 150, path.join(build, "Wide310x150Logo.png")),
]);

// Multi-size ICO for both favicon and Electron main icon
await ico([16, 32, 48, 256], path.join(root, "public", "favicon.ico"));
await ico([16, 32, 48, 256], path.join(build, "icon.ico"));

console.log("\nDone. Add to package.json build config:\n  \"icon\": \"build/icon\"");
