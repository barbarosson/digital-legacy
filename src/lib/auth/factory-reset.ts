import fs from "node:fs";
import path from "node:path";
import { closeCachedConnection } from "@/lib/db";
import { BACKUPS_DIR, DATA_DIR, DB_PATH, VIDEOS_DIR } from "@/lib/paths";

/**
 * Wipe local vault data so a new PIN can be created.
 * Keeps the data directory itself; removes DB, videos, reminder configs.
 */
export async function factoryResetVault() {
  closeCachedConnection();

  for (const file of [
    DB_PATH,
    `${DB_PATH}-wal`,
    `${DB_PATH}-shm`,
    path.join(DATA_DIR, "reminder.json"),
    path.join(DATA_DIR, "usb-reminder.json"),
  ]) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }

  if (fs.existsSync(VIDEOS_DIR)) {
    fs.rmSync(VIDEOS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
