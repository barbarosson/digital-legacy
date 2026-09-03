import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

execSync("npx electron-builder --win", {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  },
});

// electron-builder kök node_modules'u Electron için derleyebilir;
// Next.js dev sunucusu sistem Node sürümünü kullanır — geri yükle.
console.log("better-sqlite3 sistem Node için yeniden derleniyor...");
execSync("npm rebuild better-sqlite3", {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
