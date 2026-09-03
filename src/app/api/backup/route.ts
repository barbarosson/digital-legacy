import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { formatBytes, getBackupInfo } from "@/lib/backup/database";
import { checkpointDatabase } from "@/lib/db";
import { DB_PATH } from "@/lib/paths";

export async function GET() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  const info = getBackupInfo();

  return NextResponse.json({
    sizeBytes: info.sizeBytes,
    sizeLabel: formatBytes(info.sizeBytes),
    updatedAt: info.updatedAt,
    autoBackups: info.backups.map((backup) => ({
      ...backup,
      sizeLabel: formatBytes(backup.sizeBytes),
    })),
  });
}

export async function POST() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json(
      { error: "Database file not found." },
      { status: 404 },
    );
  }

  checkpointDatabase();

  const buffer = fs.readFileSync(DB_PATH);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `digital-legacy-backup-${stamp}.db`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
