import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const outputDir = path.join(root, "dist-electron", "app");

function copyDir(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, destination, { recursive: true, force: true, dereference: true });
}

if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
  console.error('Run "npm run build" first (.next/standalone is required).');
  process.exit(1);
}

fs.rmSync(path.join(root, "dist-electron"), { recursive: true, force: true });
copyDir(standaloneDir, outputDir);
copyDir(path.join(root, ".next", "static"), path.join(outputDir, ".next", "static"));

const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(outputDir, "public"));
}

copyDir(path.join(root, "drizzle"), path.join(outputDir, "drizzle"));
copyDir(path.join(root, "docs"), path.join(outputDir, "docs"));

const electronVersion = require("electron/package.json").version;
const sqliteModule = path.join(outputDir, "node_modules", "better-sqlite3");

if (fs.existsSync(sqliteModule)) {
  console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion}...`);
  execSync(
    `npx electron-rebuild -f -w better-sqlite3 --version ${electronVersion}`,
    { cwd: outputDir, stdio: "inherit", shell: true },
  );
}

console.log("Electron package ready:", outputDir);
