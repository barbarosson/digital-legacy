import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import { decryptVaultBuffer } from "@/lib/cloud/vault-crypto";

/**
 * Decrypt a .dlenc vault into a .db download (restore via Backup page).
 * Does not overwrite the live database.
 */
export async function POST(request: Request) {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("cloud_backup"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length < 64) {
    return NextResponse.json({ error: "Invalid vault file." }, { status: 400 });
  }

  const plain = decryptVaultBuffer(buffer, session.dataKey);
  if (!plain) {
    return NextResponse.json(
      {
        error:
          "Could not decrypt. Use the same device PIN that created this backup.",
      },
      { status: 400 },
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `digital-legacy-restored-${stamp}.db`;

  return new NextResponse(new Uint8Array(plain), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(plain.length),
    },
  });
}
