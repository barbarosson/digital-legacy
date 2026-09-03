import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultProjectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Uygulama kökü — Electron paketinde standalone sunucu dizini */
export const PROJECT_ROOT = process.env.DIJITAL_MIRAS_ROOT
  ? path.resolve(process.env.DIJITAL_MIRAS_ROOT)
  : defaultProjectRoot;

/** Kullanıcı verileri — Electron'da userData/data, geliştirmede proje/data */
export const DATA_DIR = process.env.DIJITAL_MIRAS_DATA_DIR
  ? path.resolve(process.env.DIJITAL_MIRAS_DATA_DIR)
  : path.join(defaultProjectRoot, "data");

export const DB_PATH = path.join(DATA_DIR, "dijital-miras.db");
export const BACKUPS_DIR = path.join(DATA_DIR, "backups");
export const VIDEOS_DIR = path.join(DATA_DIR, "videos");
export const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "drizzle");
