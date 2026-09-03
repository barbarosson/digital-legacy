import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dataDir = path.join(projectRoot, "data");
const dbPath = path.join(dataDir, "dijital-miras.db");
const migrationsFolder = path.join(projectRoot, "drizzle");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder });

console.log("Migrations applied:", dbPath);
console.log(
  "Tables:",
  sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
);

sqlite.close();
