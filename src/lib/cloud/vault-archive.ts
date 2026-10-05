import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { isValidSqliteBuffer } from "@/lib/backup/database";
import { checkpointDatabase } from "@/lib/db";
import { DB_PATH, VIDEOS_DIR } from "@/lib/paths";

export const VAULT_ARCHIVE_VERSION = 1;
export const VAULT_DB_ENTRY = "dijital-miras.db";
export const VAULT_MANIFEST_ENTRY = "manifest.json";
export const VAULT_VIDEOS_PREFIX = "videos/";

export type VaultManifest = {
  version: number;
  format: "dlvault";
  createdAt: string;
  videoCount: number;
  dbBytes: number;
};

export type BuiltVaultArchive = {
  zipBuffer: Buffer;
  manifest: VaultManifest;
};

function ensureVideosDir() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
}

/** Build an unencrypted ZIP: SQLite + on-disk video blobs (already PIN-encrypted). */
export async function buildVaultArchiveZip(): Promise<BuiltVaultArchive> {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error("Database file not found.");
  }

  checkpointDatabase();
  const dbBytes = fs.readFileSync(DB_PATH);
  if (!isValidSqliteBuffer(dbBytes)) {
    throw new Error("Database file is not a valid SQLite file.");
  }

  ensureVideosDir();
  const videoNames = fs
    .readdirSync(VIDEOS_DIR)
    .filter((name) => fs.statSync(path.join(VIDEOS_DIR, name)).isFile());

  const manifest: VaultManifest = {
    version: VAULT_ARCHIVE_VERSION,
    format: "dlvault",
    createdAt: new Date().toISOString(),
    videoCount: videoNames.length,
    dbBytes: dbBytes.length,
  };

  const zip = new JSZip();
  zip.file(VAULT_MANIFEST_ENTRY, JSON.stringify(manifest, null, 2));
  zip.file(VAULT_DB_ENTRY, dbBytes);

  for (const name of videoNames) {
    const filePath = path.join(VIDEOS_DIR, name);
    zip.file(`${VAULT_VIDEOS_PREFIX}${name}`, fs.readFileSync(filePath));
  }

  const zipBuffer = Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );

  return { zipBuffer, manifest };
}

export function isZipBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

export type ParsedVaultArchive = {
  kind: "archive" | "legacy-db";
  db: Buffer;
  videos: Map<string, Buffer>;
  manifest: VaultManifest | null;
};

/** Parse decrypted payload: new ZIP archive or legacy raw SQLite. */
export async function parseVaultPlaintext(
  plaintext: Buffer,
): Promise<ParsedVaultArchive> {
  if (isValidSqliteBuffer(plaintext)) {
    return {
      kind: "legacy-db",
      db: plaintext,
      videos: new Map(),
      manifest: null,
    };
  }

  if (!isZipBuffer(plaintext)) {
    throw new Error("Unrecognized vault contents after decrypt.");
  }

  const zip = await JSZip.loadAsync(plaintext);
  const dbEntry = zip.file(VAULT_DB_ENTRY);
  if (!dbEntry) {
    throw new Error("Vault archive is missing the database.");
  }

  const db = Buffer.from(await dbEntry.async("nodebuffer"));
  if (!isValidSqliteBuffer(db)) {
    throw new Error("Vault archive database is invalid.");
  }

  let manifest: VaultManifest | null = null;
  const manifestEntry = zip.file(VAULT_MANIFEST_ENTRY);
  if (manifestEntry) {
    try {
      manifest = JSON.parse(await manifestEntry.async("string")) as VaultManifest;
    } catch {
      manifest = null;
    }
  }

  const videos = new Map<string, Buffer>();
  const jobs: Promise<void>[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.startsWith(VAULT_VIDEOS_PREFIX)) return;
    const name = relativePath.slice(VAULT_VIDEOS_PREFIX.length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return;
    }
    jobs.push(
      file.async("nodebuffer").then((buf) => {
        videos.set(name, Buffer.from(buf));
      }),
    );
  });
  await Promise.all(jobs);

  return { kind: "archive", db, videos, manifest };
}
