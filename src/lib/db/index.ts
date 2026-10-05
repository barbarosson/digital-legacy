import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import { DATA_DIR, DB_PATH, MIGRATIONS_DIR } from "@/lib/paths";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

function migrationCount(sqlite: Database.Database): number {
  try {
    const row = sqlite
      .prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations")
      .get() as { count: number };
    return row.count;
  } catch {
    return 0;
  }
}

function hasAuthTables(sqlite: Database.Database): boolean {
  const row = sqlite
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='app_settings' LIMIT 1",
    )
    .get();
  return Boolean(row);
}

export function closeCachedConnection() {
  const sqlite = globalThis.__dijitalMirasSqlite;
  if (sqlite) {
    try {
      if (sqlite.open) sqlite.close();
    } catch {
      // already closed / replaced on disk
    }
  }
  globalThis.__dijitalMirasSqlite = undefined;
  globalThis.__dijitalMirasDb = undefined;
  dbInstance = undefined;
}

function openDatabase(): { sqlite: Database.Database; db: DbInstance } {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  return { sqlite, db };
}

declare global {
  // eslint-disable-next-line no-var
  var __dijitalMirasSqlite: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __dijitalMirasDb: DbInstance | undefined;
}

let dbInstance: DbInstance | undefined;

function connectDatabase(): DbInstance {
  const cachedSqlite = globalThis.__dijitalMirasSqlite;
  const cachedDb = globalThis.__dijitalMirasDb;

  if (cachedSqlite?.open && cachedDb) {
    const before = migrationCount(cachedSqlite);
    migrate(cachedDb, { migrationsFolder: MIGRATIONS_DIR });
    const after = migrationCount(cachedSqlite);

    if (after > before || !hasAuthTables(cachedSqlite)) {
      closeCachedConnection();
    } else {
      return cachedDb;
    }
  } else if (cachedSqlite || cachedDb) {
    closeCachedConnection();
  }

  const { sqlite, db } = openDatabase();

  // Always keep handles so factory-reset / reload can close the file on Windows.
  globalThis.__dijitalMirasSqlite = sqlite;
  globalThis.__dijitalMirasDb = db;

  return db;
}

function isLiveConnection(): boolean {
  const sqlite = globalThis.__dijitalMirasSqlite;
  return Boolean(sqlite?.open && globalThis.__dijitalMirasDb);
}

export function getDb(): DbInstance {
  // Prefer globalThis so Turbopack/Next module copies don't keep a closed handle.
  if (isLiveConnection()) {
    dbInstance = globalThis.__dijitalMirasDb!;
    return dbInstance;
  }
  if (dbInstance || globalThis.__dijitalMirasSqlite || globalThis.__dijitalMirasDb) {
    closeCachedConnection();
  }
  dbInstance = connectDatabase();
  return dbInstance;
}

export function reloadDatabase(): DbInstance {
  closeCachedConnection();
  dbInstance = connectDatabase();
  return dbInstance;
}

export function checkpointDatabase() {
  const sqlite = globalThis.__dijitalMirasSqlite;
  if (sqlite?.open) {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
  }
}

export { schema };
