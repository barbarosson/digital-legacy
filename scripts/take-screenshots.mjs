/**
 * Capture Store screenshots. Expects a FRESH data dir (no PIN yet) on :3002
 * so we can set up PIN 123456 and walk the panel.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const BASE = "http://127.0.0.1:3002";
const DEMO_PIN = "123456";

async function saveShot(page, name) {
  const raw = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: raw, fullPage: false });
  const big = path.join(outDir, `${name}-1920.png`);
  await sharp(raw).resize(1920, 1200, { fit: "cover", position: "top" }).png().toFile(big);
  console.log("  ✓", name);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
  locale: "en-US",
});
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(1000);
await saveShot(page, "01-landing");

await page.goto(`${BASE}/giris`, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForSelector("input[type=password]", { timeout: 15_000 });
await page.waitForTimeout(600);
await saveShot(page, "02-pin");

// Setup or unlock
const passwords = page.locator("input[type=password]");
const n = await passwords.count();
if (n >= 2) {
  // Setup mode
  await passwords.nth(0).fill(DEMO_PIN);
  await passwords.nth(1).fill(DEMO_PIN);
} else {
  await passwords.first().fill(DEMO_PIN);
}
await page.getByRole("button").filter({ hasText: /unlock|set|create|kaydet|oluştur|continue/i }).first().click().catch(async () => {
  await page.locator("button[type=submit]").first().click();
});
await page.waitForURL(/\/panel/, { timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(1200);

const panelPages = [
  { name: "03-overview", url: "/panel" },
  { name: "04-calendar", url: "/panel/takvim" },
  { name: "05-assets", url: "/panel/varliklar" },
  { name: "06-messages", url: "/panel/mesajlar" },
  { name: "07-settings", url: "/panel/ayarlar" },
];

for (const { name, url } of panelPages) {
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(900);
    if (page.url().includes("/giris")) {
      console.warn("  ✗", name, "(still locked)");
      continue;
    }
    await saveShot(page, name);
  } catch (e) {
    console.warn("  ✗", name, e.message);
  }
}

await browser.close();
console.log(`\nSaved to ${outDir}`);
