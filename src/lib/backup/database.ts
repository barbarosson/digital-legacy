import fs from "node:fs";
import path from "node:path";
import { BACKUPS_DIR, DB_PATH, VIDEOS_DIR } from "@/lib/paths";
import {
  checkpointDatabase,
  closeCachedConnection,
  reloadDatabase,
} from "@/lib/db";

const SQLITE_HEADER = "SQLite format 3\u0000";

export type BackupInfo = {
  exists: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  backups: { name: string; sizeBytes: number; updatedAt: string }[];
};

export function isValidSqliteFile(filePath: string): boolean {
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  return buffer.toString("utf8") === SQLITE_HEADER;
}

export function isValidSqliteBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 16).toString("utf8") === SQLITE_HEADER;
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function removeWalFiles() {
  for (const suffix of ["-wal", "-shm"]) {
    const file = `${DB_PATH}${suffix}`;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

export function getBackupInfo(): BackupInfo {
  ensureBackupsDir();

  const exists = fs.existsSync(DB_PATH);
  const stat = exists ? fs.statSync(DB_PATH) : null;

  const backups = fs
    .readdirSync(BACKUPS_DIR)
    .filter((name) => name.endsWith(".db"))
    .map((name) => {
      const filePath = path.join(BACKUPS_DIR, name);
      const fileStat = fs.statSync(filePath);
      return {
        name,
        sizeBytes: fileStat.size,
        updatedAt: fileStat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    exists,
    sizeBytes: stat?.size ?? 0,
    updatedAt: stat?.mtime.toISOString() ?? null,
    backups,
  };
}

export function createAutoBackupBeforeRestore(): string {
  ensureBackupsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `oncesi-${stamp}.db`);
  fs.copyFileSync(DB_PATH, backupPath);
  return backupPath;
}

export function restoreDatabaseFromBuffer(buffer: Buffer) {
  if (!isValidSqliteBuffer(buffer)) {
    throw new Error("Invalid SQLite file.");
  }

  checkpointDatabase();
  closeCachedConnection();

  if (fs.existsSync(DB_PATH)) {
    createAutoBackupBeforeRestore();
  }

  const tempPath = `${DB_PATH}.restore`;
  fs.writeFileSync(tempPath, buffer);

  if (!isValidSqliteFile(tempPath)) {
    fs.unlinkSync(tempPath);
    throw new Error("Backup file could not be verified.");
  }

  fs.renameSync(tempPath, DB_PATH);
  removeWalFiles();
  reloadDatabase();
}

/**
 * Replace on-disk calendar media with files from a cloud vault archive.
 * Existing videos are moved aside under data/backups/ before overwrite.
 */
export function restoreVideosFromMap(videos: Map<string, Buffer>) {
  ensureBackupsDir();

  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  const existing = fs
    .readdirSync(VIDEOS_DIR)
    .filter((name) => fs.statSync(path.join(VIDEOS_DIR, name)).isFile());

  if (existing.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const aside = path.join(BACKUPS_DIR, `videos-oncesi-${stamp}`);
    fs.mkdirSync(aside, { recursive: true });
    for (const name of existing) {
      fs.renameSync(path.join(VIDEOS_DIR, name), path.join(aside, name));
    }
  }

  for (const [name, buf] of videos) {
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      continue;
    }
    fs.writeFileSync(path.join(VIDEOS_DIR, name), buf);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
