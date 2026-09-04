/**
 * Re-generates all icon assets from public/icon-source.png
 * (the AI-generated master icon, 1024×1024 or larger)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "icon-source.png");

if (!fs.existsSync(src)) {
  console.error("public/icon-source.png not found.");
  process.exit(1);
}

const build = path.join(root, "build");
const buildIcons = path.join(build, "icons");
for (const dir of [build, buildIcons]) fs.mkdirSync(dir, { recursive: true });

async function png(size, dest) {
  await sharp(src).resize(size, size).ensureAlpha().png().toFile(dest);
  console.log("  ✓", path.relative(root, dest));
}

async function wide(w, h, dest) {
  const sq = Math.min(w, h);
  const inner = await sharp(src).resize(sq, sq).ensureAlpha().png().toBuffer();
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toFile(dest);
  console.log("  ✓", path.relative(root, dest));
}

async function ico(sizes, dest) {
  const entries = await Promise.all(
    sizes.map(async (s) => ({
      size: s,
      buf: await sharp(src).resize(s, s).ensureAlpha().png().toBuffer(),
    })),
  );
  const count = entries.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const images = [];
  for (let i = 0; i < count; i++) {
    const { size, buf } = entries[i];
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    header.writeUInt8(w, 6 + i * 16);
    header.writeUInt8(h, 7 + i * 16);
    header.writeUInt8(0, 8 + i * 16);
    header.writeUInt8(0, 9 + i * 16);
    header.writeUInt16LE(1, 10 + i * 16);
    header.writeUInt16LE(32, 12 + i * 16);
    header.writeUInt32LE(buf.length, 14 + i * 16);
    header.writeUInt32LE(offset, 18 + i * 16);
    offset += buf.length;
    images.push(buf);
  }
  fs.writeFileSync(dest, Buffer.concat([header, ...images]));
  console.log("  ✓", path.relative(root, dest));
}

console.log("Generating icons from public/icon-source.png …");

await Promise.all([
  ...[16, 32, 48, 64, 128, 256, 512].map((s) => png(s, path.join(buildIcons, `${s}x${s}.png`))),
  png(512, path.join(build, "icon.png")),
  png(256, path.join(root, "public", "icon-256.png")),
  png(512, path.join(root, "public", "icon-512.png")),
  png(50,  path.join(build, "StoreLogo.png")),
  png(44,  path.join(build, "Square44x44Logo.png")),
  png(150, path.join(build, "Square150x150Logo.png")),
  png(300, path.join(root, "public", "store-listing-300.png")),
  wide(310, 150, path.join(build, "Wide310x150Logo.png")),
]);

await ico([16, 32, 48, 256], path.join(root, "public", "favicon.ico"));
await ico([16, 32, 48, 256], path.join(build, "icon.ico"));

console.log("\nAll icons ready.");
