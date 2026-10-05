import { NextResponse } from "next/server";
import { requireUnlockedSession } from "@/lib/auth/guard";
import { canUse } from "@/lib/entitlements";
import { buildVaultArchiveZip } from "@/lib/cloud/vault-archive";
import { encryptVaultBuffer, sha256Hex } from "@/lib/cloud/vault-crypto";

/** Build an encrypted vault blob (DB + videos) for Pro Cloud upload. */
export async function POST() {
  const session = await requireUnlockedSession();
  if (session instanceof NextResponse) return session;

  if (!(await canUse("cloud_backup"))) {
    return NextResponse.json(
      { error: "Pro feature", code: "PRO_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    const { zipBuffer, manifest } = await buildVaultArchiveZip();
    const packed = encryptVaultBuffer(zipBuffer, session.dataKey);
    const hash = sha256Hex(packed);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `digital-legacy-vault-${stamp}.dlenc`;

    return new NextResponse(new Uint8Array(packed), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(packed.length),
        "X-Content-Hash": hash,
        "X-Plain-Size": String(zipBuffer.length),
        "X-Video-Count": String(manifest.videoCount),
        "X-Archive-Kind": "dlvault",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not build vault package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
