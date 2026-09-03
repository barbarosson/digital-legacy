import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dataDir = path.join(projectRoot, "data");
const dbPath = path.join(dataDir, "dijital-miras.db");
const backupsDir = path.join(dataDir, "backups");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupsDir, `manuel-${stamp}.db`);

if (!fs.existsSync(dbPath)) {
  console.error("Veritabanı bulunamadı:", dbPath);
  process.exit(1);
}

fs.copyFileSync(dbPath, backupPath);
console.log("Yedek oluşturuldu:", backupPath);
