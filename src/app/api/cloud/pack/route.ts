import { NextResponse } from "next/server";
import fs from "node:fs";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import { encryptVaultBuffer, sha256Hex } from "@/lib/cloud/vault-crypto";
import { checkpointDatabase } from "@/lib/db";
import { DB_PATH } from "@/lib/paths";

/** Build an encrypted vault blob for Pro Cloud upload (PIN session required). */
export async function POST() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("cloud_backup"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json(
      { error: "Database file not found." },
      { status: 404 },
    );
  }

  checkpointDatabase();
  const plaintext = fs.readFileSync(DB_PATH);
  const packed = encryptVaultBuffer(plaintext, session.dataKey);
  const hash = sha256Hex(packed);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `digital-legacy-vault-${stamp}.dlenc`;

  return new NextResponse(new Uint8Array(packed), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(packed.length),
      "X-Content-Hash": hash,
      "X-Plain-Size": String(plaintext.length),
    },
  });
}
